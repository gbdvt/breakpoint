/**
 * Drift nudge: crystal-grey glass, 3s countdown then red accent.
 * No buttons — switch tab (tab hidden) dismisses; auto-dismiss after 32s.
 */
(function () {
  const ROOT_ID = "breakpoint-drift-overlay-root";
  const STORAGE_KEY = "breakpoint_last_drift_ui";

  async function run() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const payload = data[STORAGE_KEY];

    if (!payload || typeof payload !== "object") return;

    const headline = String(payload.headline || "Drift signal");
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
        bottom: 20px;
        z-index: 2147483647;
        width: min(340px, calc(100vw - 28px));
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: rgba(30, 41, 59, 0.94);
        background: linear-gradient(
          168deg,
          rgba(252, 252, 253, 0.92) 0%,
          rgba(235, 238, 245, 0.88) 42%,
          rgba(218, 224, 234, 0.86) 100%
        );
        -webkit-backdrop-filter: blur(22px) saturate(1.2);
        backdrop-filter: blur(22px) saturate(1.2);
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 18px;
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.05) inset,
          0 1px 0 rgba(255, 255, 255, 0.7) inset,
          0 16px 48px rgba(15, 23, 42, 0.12),
          0 6px 16px rgba(15, 23, 42, 0.06);
        padding: 14px 16px 14px;
        transition: border-color 0.5s ease, box-shadow 0.5s ease, background 0.5s ease;
      }
      .wrap.urgent {
        background: linear-gradient(
          168deg,
          rgba(254, 248, 248, 0.94) 0%,
          rgba(243, 232, 232, 0.9) 45%,
          rgba(235, 224, 224, 0.88) 100%
        );
        border-color: rgba(252, 165, 165, 0.9);
        box-shadow:
          0 0 0 1px rgba(248, 113, 113, 0.25) inset,
          0 0 0 3px rgba(248, 113, 113, 0.28),
          0 18px 52px rgba(185, 28, 28, 0.14),
          0 6px 16px rgba(127, 29, 29, 0.08);
      }
      .brand {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(100, 116, 139, 0.85);
        margin-bottom: 6px;
      }
      .wrap.urgent .brand {
        color: rgba(185, 28, 28, 0.88);
      }
      .headline {
        font-weight: 650;
        font-size: 15px;
        margin: 0 0 6px;
        color: rgba(15, 23, 42, 0.96);
        letter-spacing: -0.01em;
      }
      .body {
        margin: 0 0 10px;
        color: rgba(51, 65, 85, 0.95);
        font-size: 12.5px;
      }
      .goal {
        margin: 0 0 10px;
        font-size: 11.5px;
        color: rgba(71, 85, 105, 0.92);
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.5);
      }
      .countdown {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: rgba(71, 85, 105, 0.95);
        margin: 0 0 8px;
        padding: 6px 10px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(226, 232, 240, 0.9);
      }
      .wrap.urgent .countdown {
        color: rgba(153, 27, 27, 0.95);
        background: rgba(254, 226, 226, 0.55);
        border-color: rgba(252, 165, 165, 0.65);
      }
      .hint {
        margin: 0;
        font-size: 11px;
        color: rgba(100, 116, 139, 0.9);
        line-height: 1.35;
      }
    `;

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");

    const brand = document.createElement("div");
    brand.className = "brand";
    brand.textContent = "Breakpoint";

    const h = document.createElement("h2");
    h.className = "headline";
    h.textContent = headline;

    const p = document.createElement("p");
    p.className = "body";
    p.textContent = body;

    const countdownEl = document.createElement("div");
    countdownEl.className = "countdown";

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      "Switch away from this tab to dismiss — or wait, it fades on its own.";

    let sec = 3;
    countdownEl.textContent = `Settling · ${sec}s`;

    let tornDown = false;
    let intervalId = 0;
    let autoTimeout = 0;

    function teardown() {
      if (tornDown) return;
      tornDown = true;
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      if (autoTimeout) window.clearTimeout(autoTimeout);
      host.remove();
      try {
        chrome.runtime.sendMessage({ type: "OVERLAY_DISMISSED" });
      } catch {
        /* ignore */
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        teardown();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);

    intervalId = window.setInterval(() => {
      sec -= 1;
      if (sec > 0) {
        countdownEl.textContent = `Settling · ${sec}s`;
      } else {
        window.clearInterval(intervalId);
        intervalId = 0;
        wrap.classList.add("urgent");
        countdownEl.textContent = "Still drifting — come back when ready";
      }
    }, 1000);

    autoTimeout = window.setTimeout(teardown, 32000);

    wrap.append(brand, h, p);
    if (goal) {
      const g = document.createElement("p");
      g.className = "goal";
      g.textContent = `Goal: ${goal}`;
      wrap.append(g);
    }
    wrap.append(countdownEl, hint);

    shadow.append(style, wrap);

    const root = document.body || document.documentElement;
    root.appendChild(host);
  }

  void run();
})();
