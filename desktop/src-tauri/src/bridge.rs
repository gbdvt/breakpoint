//! Chrome extension ↔ desktop: mirror state (POST) + command queue (GET poll).

use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};
use tiny_http::{Header, Method, Response, Server};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgePayload {
    pub session: Option<Value>,
    pub events: Vec<Value>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeSnapshot {
    pub session: Option<Value>,
    pub events: Vec<Value>,
    pub updated_at_ms: i64,
}

impl Default for BridgeSnapshot {
    fn default() -> Self {
        Self {
            session: None,
            events: vec![],
            updated_at_ms: 0,
        }
    }
}

enum PendingCommand {
    SessionStart(Value),
    SessionEnd,
    ClearAll,
}

pub struct BridgeHub {
    pub snapshot: BridgeSnapshot,
    pending: Option<PendingCommand>,
}

impl Default for BridgeHub {
    fn default() -> Self {
        Self {
            snapshot: BridgeSnapshot::default(),
            pending: None,
        }
    }
}

pub type SharedHub = Arc<Mutex<BridgeHub>>;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn emit_bridge_refresh(app: &AppHandle) {
    let _ = app.emit("chrome-bridge-updated", ());
}

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        Header::from_bytes(
            &b"Access-Control-Allow-Methods"[..],
            &b"GET, POST, OPTIONS"[..],
        )
        .unwrap(),
        Header::from_bytes(
            &b"Access-Control-Allow-Headers"[..],
            &b"Content-Type"[..],
        )
        .unwrap(),
    ]
}

fn add_cors_to_string_response(
    mut res: Response<std::io::Cursor<Vec<u8>>>,
) -> Response<std::io::Cursor<Vec<u8>>> {
    for h in cors_headers() {
        res.add_header(h);
    }
    res
}

fn add_cors_to_empty_response(mut res: Response<std::io::Empty>) -> Response<std::io::Empty> {
    for h in cors_headers() {
        res.add_header(h);
    }
    res
}

fn normalize_path(url: &str) -> &str {
    url.split('?').next().unwrap_or("/").trim_end_matches('/')
}

pub fn spawn_bridge_server(app: AppHandle, hub: SharedHub) {
    let server = match Server::http("127.0.0.1:17871") {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[breakpoint] Chrome bridge failed to bind 127.0.0.1:17871: {e}");
            return;
        }
    };

    eprintln!(
        "[breakpoint] Extension: POST state → /breakpoint/state · poll commands → GET /breakpoint/poll"
    );

    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            if request.method() == &Method::Options {
                let res = Response::empty(204);
                let _ = request.respond(add_cors_to_empty_response(res));
                continue;
            }

            let raw_path = request.url();
            let path = normalize_path(raw_path);

            if request.method() == &Method::Get && path == "/breakpoint/poll" {
                let body = {
                    let mut g = hub.lock().unwrap();
                    let val = match g.pending.take() {
                        None => json!({ "command": null }),
                        Some(PendingCommand::SessionStart(session)) => {
                            json!({ "command": "SESSION_START", "session": session })
                        }
                        Some(PendingCommand::SessionEnd) => json!({ "command": "SESSION_END" }),
                        Some(PendingCommand::ClearAll) => json!({ "command": "CLEAR_ALL" }),
                    };
                    serde_json::to_string(&val).unwrap_or_else(|_| r#"{"command":null}"#.into())
                };
                let res = Response::from_string(body);
                let _ = request.respond(add_cors_to_string_response(res));
                continue;
            }

            if request.method() != &Method::Post {
                let res = Response::from_string("{\"ok\":false}")
                    .with_status_code(404);
                let _ = request.respond(add_cors_to_string_response(res));
                continue;
            }

            if path != "/breakpoint/state" {
                let res = Response::from_string("{\"ok\":false}")
                    .with_status_code(404);
                let _ = request.respond(add_cors_to_string_response(res));
                continue;
            }

            let mut body = String::new();
            if std::io::Read::read_to_string(&mut request.as_reader(), &mut body).is_err() {
                let res = Response::from_string("{\"ok\":false}")
                    .with_status_code(400);
                let _ = request.respond(add_cors_to_string_response(res));
                continue;
            }

            let parsed: Result<BridgePayload, _> = serde_json::from_str(&body);
            match parsed {
                Ok(p) => {
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map(|d| d.as_millis() as i64)
                        .unwrap_or(0);
                    let snap = BridgeSnapshot {
                        session: p.session,
                        events: p.events,
                        updated_at_ms: now,
                    };
                    {
                        let mut g = hub.lock().unwrap();
                        g.snapshot = snap;
                    }
                    let _ = app.emit("chrome-bridge-updated", ());
                    let res = Response::from_string("{\"ok\":true}");
                    let _ = request.respond(add_cors_to_string_response(res));
                }
                Err(_) => {
                    let res = Response::from_string("{\"ok\":false}")
                        .with_status_code(400);
                    let _ = request.respond(add_cors_to_string_response(res));
                }
            }
        }
    });
}

#[tauri::command]
pub fn get_chrome_bridge_state(hub: State<SharedHub>) -> Result<BridgeSnapshot, String> {
    hub.lock()
        .map(|g| g.snapshot.clone())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn queue_session_start(
    app: AppHandle,
    hub: State<SharedHub>,
    session: Value,
) -> Result<(), String> {
    let mut g = hub.lock().map_err(|e| e.to_string())?;
    g.pending = Some(PendingCommand::SessionStart(session.clone()));
    let t = now_ms();
    g.snapshot.session = Some(session);
    g.snapshot.events = vec![];
    g.snapshot.updated_at_ms = t;
    drop(g);
    emit_bridge_refresh(&app);
    Ok(())
}

#[tauri::command]
pub fn queue_session_end(app: AppHandle, hub: State<SharedHub>) -> Result<(), String> {
    let mut g = hub.lock().map_err(|e| e.to_string())?;
    g.pending = Some(PendingCommand::SessionEnd);
    let t = now_ms();
    if let Some(Value::Object(ref mut map)) = g.snapshot.session {
        map.insert("endedAt".to_string(), json!(t));
    }
    g.snapshot.updated_at_ms = t;
    drop(g);
    emit_bridge_refresh(&app);
    Ok(())
}

#[tauri::command]
pub fn queue_clear_extension_state(app: AppHandle, hub: State<SharedHub>) -> Result<(), String> {
    let mut g = hub.lock().map_err(|e| e.to_string())?;
    g.pending = Some(PendingCommand::ClearAll);
    let t = now_ms();
    g.snapshot = BridgeSnapshot {
        updated_at_ms: t,
        ..Default::default()
    };
    drop(g);
    emit_bridge_refresh(&app);
    Ok(())
}
