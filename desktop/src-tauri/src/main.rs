#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;

use std::sync::atomic::{AtomicBool, Ordering};

use bridge::{
    get_chrome_bridge_state, queue_clear_extension_state, queue_session_end, queue_session_start,
    spawn_bridge_server, SharedHub,
};
use tauri::{Manager, WebviewUrl};
use tauri::webview::WebviewWindowBuilder;
use tauri::window::Color;

static FLOATING_ON_TOP: AtomicBool = AtomicBool::new(true);

#[tauri::command]
fn open_floating_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("floating") {
        w.show().map_err(|e| e.to_string())?;
        let _ = w.unminimize();
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    FLOATING_ON_TOP.store(true, Ordering::SeqCst);

    WebviewWindowBuilder::new(
        &app,
        "floating",
        WebviewUrl::App("floating.html".into()),
    )
    .title("Breakpoint · HUD")
    .inner_size(520.0, 76.0)
    .min_inner_size(360.0, 68.0)
    .max_inner_size(640.0, 112.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(false)
    .background_color(Color(0, 0, 0, 0))
    .build()
    .map_err(|e| {
        eprintln!("[breakpoint] floating webview failed: {e}");
        e.to_string()
    })?;

    Ok(())
}

#[tauri::command]
fn close_floating_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("floating") {
        w.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn toggle_floating_always_on_top(app: tauri::AppHandle) -> Result<bool, String> {
    let Some(w) = app.get_webview_window("floating") else {
        return Err("Floating window is not open.".into());
    };
    let next = !FLOATING_ON_TOP.load(Ordering::SeqCst);
    FLOATING_ON_TOP.store(next, Ordering::SeqCst);
    w.set_always_on_top(next).map_err(|e| e.to_string())?;
    Ok(next)
}

#[tauri::command]
fn open_focus_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("focus") {
        w.show().map_err(|e| e.to_string())?;
        let _ = w.unminimize();
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "focus",
        WebviewUrl::App("focus.html".into()),
    )
    .title("Breakpoint · Focus")
    .inner_size(460.0, 680.0)
    .min_inner_size(400.0, 520.0)
    .resizable(true)
    .decorations(true)
    .transparent(false)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        w.show().map_err(|e| e.to_string())?;
        let _ = w.unminimize();
        w.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn main() {
    let hub: SharedHub = std::sync::Arc::new(std::sync::Mutex::new(bridge::BridgeHub::default()));

    tauri::Builder::default()
        .manage(hub.clone())
        .setup(move |app| {
            spawn_bridge_server(app.handle().clone(), hub.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_floating_window,
            close_floating_window,
            toggle_floating_always_on_top,
            open_focus_window,
            focus_main_window,
            get_chrome_bridge_state,
            queue_session_start,
            queue_session_end,
            queue_clear_extension_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
