import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import FloatingSessionWindow from "./FloatingSessionWindow";

document.documentElement.classList.add("floating-root");
document.documentElement.style.background = "transparent";
document.documentElement.style.backgroundColor = "transparent";
document.body.style.background = "transparent";
document.body.style.backgroundColor = "transparent";

const el = document.getElementById("root");
if (el) {
  el.style.background = "transparent";
  el.style.backgroundColor = "transparent";
}

void (async () => {
  try {
    const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    await getCurrentWebviewWindow().setBackgroundColor([0, 0, 0, 0]);
  } catch {
    /* Browser-only preview of floating.html */
  }
})();

createRoot(el!).render(
  <StrictMode>
    <FloatingSessionWindow />
  </StrictMode>,
);
