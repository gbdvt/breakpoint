import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function openFloatingWindow(): Promise<void> {
  await invoke("open_floating_window");
}

export async function closeFloatingWindow(): Promise<void> {
  await invoke("close_floating_window");
}

export async function toggleFloatingAlwaysOnTop(): Promise<boolean> {
  return await invoke<boolean>("toggle_floating_always_on_top");
}

export async function openFocusWindow(): Promise<void> {
  await invoke("open_focus_window");
}

export async function focusMainWindow(): Promise<void> {
  await invoke("focus_main_window");
}
