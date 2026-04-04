/**
 * Drift nudge: bottom-left glass pill — short countdown (0:03→0:01) then red accent.
 * No buttons; tab hidden dismisses; auto-dismiss after 32s.
 */
(function () {
  const ROOT_ID = "breakpoint-drift-overlay-root";
  const STORAGE_KEY = "breakpoint_last_drift_ui";

  const WARN_SVG = `<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5.5L4 19h16L12 5.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M12 10v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="12" cy="16.5" r="0.75" fill="currentColor"/>
  </svg>`;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  async function run() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const payload = data[STORAGE_KEY];

    if (!payload || typeof payload !== "object") return;

    const siteLabelRaw =
      typeof payload.siteLabel === "string"
        ? payload.siteLabel.trim()
        : typeof payload.domain === "string"
          ? payload.domain.replace(/^www\./i, "").trim()
          : "";
    const siteLabel = siteLabelRaw || "This tab";
    const kind = payload.kind === "research" ? "research" : "drift";
    const urgentLine =
      kind === "research"
        ? `${siteLabel} — pace check`
        : `${siteLabel} — distraction logged`;

    document.getElementById(ROOT_ID)?.remove();

    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-breakpoint-overlay", "true");

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      .pill {
        position: fixed;
        left: 16px;
        bottom: 22px;
        z-index: 2147483647;
        max-width: min(420px, calc(100vw - 32px));
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 999px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1px solid rgba(255, 255, 255, 0.55);
        background: linear-gradient(
          165deg,
          rgba(252, 252, 254, 0.88) 0%,
          rgba(232, 236, 244, 0.82) 45%,
          rgba(218, 224, 234, 0.8) 100%
        );
        -webkit-backdrop-filter: blur(20px) saturate(1.15);
        backdrop-filter: blur(20px) saturate(1.15);
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.04) inset,
          0 1px 0 rgba(255, 255, 255, 0.65) inset,
          0 12px 40px rgba(15, 23, 42, 0.12);
        color: rgba(30, 41, 59, 0.92);
        transition: border-color 0.45s ease, box-shadow 0.45s ease, background 0.45s ease, color 0.35s ease;
      }
      .pill.urgent {
        border-color: rgba(252, 165, 165, 0.85);
        background: linear-gradient(
          165deg,
          rgba(255, 240, 242, 0.92) 0%,
          rgba(252, 220, 226, 0.88) 50%,
          rgba(248, 205, 212, 0.86) 100%
        );
        color: rgba(88, 12, 24, 0.95);
        box-shadow:
          0 0 0 1px rgba(248, 113, 113, 0.2) inset,
          0 0 0 3px rgba(248, 113, 113, 0.22),
          0 14px 44px rgba(185, 28, 28, 0.14);
      }
      .timer {
        font-size: 13px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        min-width: 2.5em;
        color: rgba(51, 65, 85, 0.95);
      }
      .pill.urgent .timer {
        color: rgba(127, 29, 29, 0.92);
      }
      .ic-wrap {
        flex-shrink: 0;
        display: flex;
        color: rgba(185, 28, 28, 0.88);
        opacity: 0;
        width: 0;
        overflow: hidden;
        transition: opacity 0.35s ease, width 0.35s ease;
      }
      .pill.urgent .ic-wrap {
        opacity: 1;
        width: 15px;
      }
      .main {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: 0.01em;
      }
      .pill:not(.urgent) .main {
        color: rgba(51, 65, 85, 0.88);
      }
    `;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-live", "polite");

    const timerEl = document.createElement("span");
    timerEl.className = "timer";

    const icWrap = document.createElement("span");
    icWrap.className = "ic-wrap";
    icWrap.innerHTML = WARN_SVG;

    const mainEl = document.createElement("span");
    mainEl.className = "main";

    let sec = 3;
    function syncCopy() {
      timerEl.textContent = `0:${pad2(sec)}`;
      if (sec > 0) {
        mainEl.textContent = siteLabel;
      } else {
        mainEl.textContent = urgentLine;
      }
    }
    syncCopy();

    pill.append(timerEl, icWrap, mainEl);

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
        syncCopy();
      } else {
        window.clearInterval(intervalId);
        intervalId = 0;
        pill.classList.add("urgent");
        syncCopy();
      }
    }, 1000);

    autoTimeout = window.setTimeout(teardown, 32000);

    shadow.append(style, pill);

    const root = document.body || document.documentElement;
    root.appendChild(host);
  }

  void run();
})();
