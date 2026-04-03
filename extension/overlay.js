/**
 * Injected into the page (often YouTube) when drift crosses the threshold.
 * Payload: chrome.storage.local breakpoint_last_drift_ui (set by background).
 */
(function () {
  const ROOT_ID = "breakpoint-drift-overlay-root";
  const STORAGE_KEY = "breakpoint_last_drift_ui";

  async function run() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const payload = data[STORAGE_KEY];

    if (!payload || typeof payload !== "object") return;

    const headline = String(payload.headline || "Breakpoint");
    const body = String(payload.body || "");
    const goal = String(payload.goalLine || "");

    document.getElementById(ROOT_ID)?.remove();

    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-breakpoint-overlay", "true");

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      .wrap {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: min(360px, calc(100vw - 32px));
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.45;
        color: #0f172a;
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
        padding: 14px 14px 12px;
      }
      .label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #b45309;
        margin-bottom: 6px;
      }
      .headline {
        font-weight: 650;
        font-size: 16px;
        margin: 0 0 8px;
        color: #0f172a;
      }
      .body {
        margin: 0 0 10px;
        color: #334155;
      }
      .tip {
        margin: 0 0 10px;
        font-size: 11px;
        color: #64748b;
        line-height: 1.4;
      }
      .goal {
        margin: 0 0 12px;
        font-size: 12px;
        color: #64748b;
      }
      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      button {
        font: inherit;
        cursor: pointer;
        border-radius: 10px;
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #0f172a;
      }
      button.primary {
        background: #0f172a;
        color: #fff;
        border-color: #0f172a;
      }
      button:hover {
        filter: brightness(0.97);
      }
    `;

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", headline);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = "Breakpoint";

    const h = document.createElement("h2");
    h.className = "headline";
    h.textContent = headline;

    const p = document.createElement("p");
    p.className = "body";
    p.textContent = body;

    const tip = document.createElement("p");
    tip.className = "tip";
    tip.textContent =
      "Dismiss when you’re ready to refocus — or use the toolbar icon for a full snapshot.";

    const g = document.createElement("p");
    g.className = "goal";
    g.textContent = goal ? `Goal: ${goal}` : "";

    const row = document.createElement("div");
    row.className = "row";

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", () => teardown());

    const stay = document.createElement("button");
    stay.type = "button";
    stay.className = "primary";
    stay.textContent = "I’m staying";
    stay.addEventListener("click", () => teardown());

    function teardown() {
      host.remove();
      try {
        chrome.runtime.sendMessage({ type: "OVERLAY_DISMISSED" });
      } catch {
        /* ignore */
      }
    }

    row.append(dismiss, stay);
    wrap.append(label, h, p, tip);
    if (goal) wrap.append(g);
    wrap.append(row);

    shadow.append(style, wrap);

    const root = document.body || document.documentElement;
    root.appendChild(host);

    window.setTimeout(() => {
      if (document.getElementById(ROOT_ID)) teardown();
    }, 45000);
  }

  void run();
})();
