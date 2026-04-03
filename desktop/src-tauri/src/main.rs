#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Manager, WebviewUrl};
use tauri::webview::WebviewWindowBuilder;

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
    .title("Breakpoint · Session")
    .inner_size(420.0, 132.0)
    .min_inner_size(320.0, 112.0)
    .max_inner_size(560.0, 220.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .build()
    .map_err(|e| e.to_string())?;

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
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_floating_window,
            close_floating_window,
            toggle_floating_always_on_top,
            open_focus_window,
            focus_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
