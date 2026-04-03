import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function openFloatingWindow(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await invoke("open_floating_window");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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

export async function minimizeMainWindow(): Promise<void> {
  await getCurrentWindow().minimize();
}

export async function closeMainWindow(): Promise<void> {
  await getCurrentWindow().close();
}

/** Queued for the Chrome extension (polls GET /breakpoint/poll). */
export type DesktopSessionPayload = {
  id: string;
  goal: string;
  mode: string;
  durationMin: number;
  startedAt: number;
};

export async function queueSessionStart(
  session: DesktopSessionPayload,
): Promise<void> {
  await invoke("queue_session_start", { session });
}

export async function queueSessionEnd(): Promise<void> {
  await invoke("queue_session_end");
}

export async function queueClearExtensionState(): Promise<void> {
  await invoke("queue_clear_extension_state");
}
