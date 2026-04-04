/**
 * In-page awareness: bottom-right.
 * - variant "drift": full settle → urgent (stronger warm/red when drifting).
 * - variant "reactive_nudge": Ctrl+T / new-tab light warning (throttled in background).
 * - variant "distractor_nudge": landed on a listed drift-prone site (below full drift band).
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

  function runReactiveNudge(payload) {
    const line1 =
      typeof payload.line1 === "string" ? payload.line1.trim() : "New tab";
    const line2 =
      typeof payload.line2 === "string"
        ? payload.line2.trim()
        : "Pause before you navigate.";
    const dismissAt =
      typeof payload.dismissAt === "number"
        ? payload.dismissAt
        : Date.now() + 2400;

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
        right: 16px;
        left: auto;
        bottom: 22px;
        z-index: 2147483647;
        max-width: min(340px, calc(100vw - 32px));
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 16px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1.5px solid rgba(217, 119, 6, 0.55);
        background: linear-gradient(
          155deg,
          rgba(255, 251, 235, 0.96) 0%,
          rgba(254, 243, 199, 0.92) 50%,
          rgba(253, 230, 138, 0.88) 100%
        );
        -webkit-backdrop-filter: blur(18px) saturate(1.2);
        backdrop-filter: blur(18px) saturate(1.2);
        box-shadow:
          0 0 0 1px rgba(245, 158, 11, 0.2) inset,
          0 0 0 3px rgba(251, 191, 36, 0.28),
          0 14px 40px rgba(180, 83, 9, 0.18);
        color: rgba(120, 53, 15, 0.96);
      }
      .ic-wrap {
        flex-shrink: 0;
        margin-top: 1px;
        color: rgba(180, 83, 9, 0.92);
      }
      .text-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .l1 {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1.3;
      }
      .l2 {
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
        color: rgba(146, 64, 14, 0.88);
      }
    `;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-live", "polite");

    const icWrap = document.createElement("span");
    icWrap.className = "ic-wrap";
    icWrap.innerHTML = WARN_SVG;

    const col = document.createElement("div");
    col.className = "text-col";
    const t1 = document.createElement("div");
    t1.className = "l1";
    t1.textContent = line1;
    const t2 = document.createElement("div");
    t2.className = "l2";
    t2.textContent = line2;
    col.append(t1, t2);

    pill.append(icWrap, col);

    let tornDown = false;
    let autoTimeout = 0;

    function teardown() {
      if (tornDown) return;
      tornDown = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (autoTimeout) window.clearTimeout(autoTimeout);
      host.remove();
      try {
        chrome.runtime.sendMessage({ type: "OVERLAY_NUDGE_DONE" });
      } catch {
        /* ignore */
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") teardown();
    }

    document.addEventListener("visibilitychange", onVisibility);

    const ms = Math.max(400, dismissAt - Date.now());
    autoTimeout = window.setTimeout(teardown, ms);

    shadow.append(style, pill);
    (document.body || document.documentElement).appendChild(host);
  }

  function runDistractorNudge(payload) {
    const line1 =
      typeof payload.line1 === "string" ? payload.line1.trim() : "This site";
    const line2 =
      typeof payload.line2 === "string"
        ? payload.line2.trim()
        : "High-drift destination — still on purpose?";
    const dismissAt =
      typeof payload.dismissAt === "number"
        ? payload.dismissAt
        : Date.now() + 2800;

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
        right: 16px;
        left: auto;
        bottom: 22px;
        z-index: 2147483647;
        max-width: min(360px, calc(100vw - 32px));
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 16px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1.5px solid rgba(244, 63, 94, 0.55);
        background: linear-gradient(
          155deg,
          rgba(255, 241, 242, 0.97) 0%,
          rgba(254, 205, 211, 0.93) 50%,
          rgba(253, 164, 175, 0.9) 100%
        );
        -webkit-backdrop-filter: blur(18px) saturate(1.25);
        backdrop-filter: blur(18px) saturate(1.25);
        box-shadow:
          0 0 0 1px rgba(244, 63, 94, 0.22) inset,
          0 0 0 3px rgba(251, 113, 133, 0.35),
          0 14px 44px rgba(190, 18, 60, 0.2);
        color: rgba(88, 12, 24, 0.96);
      }
      .ic-wrap {
        flex-shrink: 0;
        margin-top: 1px;
        color: rgba(190, 18, 60, 0.92);
      }
      .text-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .l1 {
        font-size: 13px;
        font-weight: 750;
        letter-spacing: 0.02em;
        line-height: 1.3;
      }
      .l2 {
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
        color: rgba(136, 19, 55, 0.9);
      }
    `;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-live", "polite");

    const icWrap = document.createElement("span");
    icWrap.className = "ic-wrap";
    icWrap.innerHTML = WARN_SVG;

    const col = document.createElement("div");
    col.className = "text-col";
    const t1 = document.createElement("div");
    t1.className = "l1";
    t1.textContent = line1;
    const t2 = document.createElement("div");
    t2.className = "l2";
    t2.textContent = line2;
    col.append(t1, t2);

    pill.append(icWrap, col);

    let tornDown = false;
    let autoTimeout = 0;

    function teardown() {
      if (tornDown) return;
      tornDown = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (autoTimeout) window.clearTimeout(autoTimeout);
      host.remove();
      try {
        chrome.runtime.sendMessage({ type: "OVERLAY_NUDGE_DONE" });
      } catch {
        /* ignore */
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") teardown();
    }

    document.addEventListener("visibilitychange", onVisibility);

    const ms = Math.max(400, dismissAt - Date.now());
    autoTimeout = window.setTimeout(teardown, ms);

    shadow.append(style, pill);
    (document.body || document.documentElement).appendChild(host);
  }

  function runDriftCard(payload) {
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

    const queueDeltaMin =
      typeof payload.queueDeltaMin === "number" && payload.queueDeltaMin > 0
        ? Math.round(payload.queueDeltaMin)
        : 0;
    const queueTotalMin =
      typeof payload.queueTotalMin === "number"
        ? Math.max(0, Math.round(payload.queueTotalMin))
        : 0;

    const settleEndAt =
      typeof payload.settleEndAt === "number"
        ? payload.settleEndAt
        : Date.now() + 3000;
    const anchorAt =
      typeof payload.anchorAt === "number" ? payload.anchorAt : Date.now();

    function queueCaption() {
      const parts = [];
      if (queueDeltaMin > 0) parts.push(`+${queueDeltaMin}m`);
      parts.push(`~${queueTotalMin}m total`);
      return parts.join(" · ");
    }

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
        right: 16px;
        left: auto;
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
          rgba(252, 252, 254, 0.9) 0%,
          rgba(232, 236, 244, 0.84) 45%,
          rgba(218, 224, 234, 0.82) 100%
        );
        -webkit-backdrop-filter: blur(20px) saturate(1.15);
        backdrop-filter: blur(20px) saturate(1.15);
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.04) inset,
          0 1px 0 rgba(255, 255, 255, 0.65) inset,
          0 12px 40px rgba(15, 23, 42, 0.12);
        color: rgba(30, 41, 59, 0.92);
        transition: border-color 0.4s ease, box-shadow 0.4s ease, background 0.4s ease, color 0.35s ease;
      }
      .pill.urgent {
        border-color: rgba(220, 38, 38, 0.92);
        background: linear-gradient(
          165deg,
          rgba(254, 226, 226, 0.98) 0%,
          rgba(252, 165, 165, 0.94) 42%,
          rgba(248, 113, 113, 0.9) 100%
        );
        color: rgba(69, 10, 10, 0.98);
        box-shadow:
          0 0 0 2px rgba(185, 28, 28, 0.45) inset,
          0 0 0 4px rgba(239, 68, 68, 0.5),
          0 0 32px rgba(220, 38, 38, 0.42),
          0 18px 52px rgba(127, 29, 29, 0.28);
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
        color: rgba(127, 29, 29, 0.96);
      }
      .ic-wrap {
        flex-shrink: 0;
        display: flex;
        color: rgba(185, 28, 28, 0.92);
        opacity: 0;
        width: 0;
        overflow: hidden;
        transition: opacity 0.35s ease, width 0.35s ease;
      }
      .pill.urgent .ic-wrap {
        opacity: 1;
        width: 15px;
        color: rgba(153, 27, 27, 0.98);
      }
      .main-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .main {
        font-size: 12px;
        font-weight: 600;
        line-height: 1.35;
        letter-spacing: 0.01em;
      }
      .pill:not(.urgent) .main {
        color: rgba(51, 65, 85, 0.88);
      }
      .queue-line {
        font-size: 11px;
        font-weight: 500;
        line-height: 1.3;
        color: rgba(71, 85, 105, 0.78);
        letter-spacing: 0.02em;
      }
      .pill.urgent .queue-line {
        color: rgba(100, 20, 20, 0.88);
        font-weight: 600;
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

    const mainCol = document.createElement("div");
    mainCol.className = "main-col";
    const mainEl = document.createElement("span");
    mainEl.className = "main";
    const queueEl = document.createElement("div");
    queueEl.className = "queue-line";
    queueEl.textContent = queueCaption();
    mainCol.append(mainEl, queueEl);

    function remainingSec() {
      return Math.max(0, Math.ceil((settleEndAt - Date.now()) / 1000));
    }

    let urgent = Date.now() >= settleEndAt;
    function syncCopy() {
      const r = urgent ? 0 : remainingSec();
      timerEl.textContent = `0:${pad2(r)}`;
      if (!urgent) {
        mainEl.textContent = siteLabel;
      } else {
        mainEl.textContent = urgentLine;
      }
      queueEl.textContent = queueCaption();
    }
    syncCopy();
    if (urgent) pill.classList.add("urgent");

    pill.append(timerEl, icWrap, mainCol);

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
      if (document.visibilityState === "hidden") teardown();
    }

    document.addEventListener("visibilitychange", onVisibility);

    if (!urgent) {
      intervalId = window.setInterval(() => {
        if (Date.now() >= settleEndAt) {
          window.clearInterval(intervalId);
          intervalId = 0;
          urgent = true;
          pill.classList.add("urgent");
        }
        syncCopy();
      }, 250);
    }

    const untilTeardown = Math.max(0, anchorAt + 32000 - Date.now());
    autoTimeout = window.setTimeout(teardown, untilTeardown);

    shadow.append(style, pill);
    (document.body || document.documentElement).appendChild(host);
  }

  async function run() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const payload = data[STORAGE_KEY];

    if (!payload || typeof payload !== "object") return;

    if (payload.variant === "reactive_nudge") {
      runReactiveNudge(payload);
      return;
    }

    if (payload.variant === "distractor_nudge") {
      runDistractorNudge(payload);
      return;
    }

    runDriftCard(payload);
  }

  void run();
})();
