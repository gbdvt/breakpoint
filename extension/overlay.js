/**
 * Bottom-right pills — minimal copy, no raw domains.
 * variant "minimal" (tone amber | rose | red | green)
 * variant "drift" — compact settle → urgent + queue hint
 */
(function () {
  const ROOT_ID = "breakpoint-drift-overlay-root";
  const STORAGE_KEY = "breakpoint_last_drift_ui";

  const DOT_SVG = `<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.85"/></svg>`;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  const TONE_STYLES = {
    amber: {
      border: "rgba(245, 158, 11, 0.45)",
      bg: "linear-gradient(145deg, rgba(255, 251, 235, 0.96) 0%, rgba(254, 243, 199, 0.92) 100%)",
      fg: "rgba(120, 53, 15, 0.95)",
      sub: "rgba(146, 64, 14, 0.82)",
      glow: "0 0 0 2px rgba(251, 191, 36, 0.35), 0 12px 36px rgba(180, 83, 9, 0.12)",
      ic: "rgba(217, 119, 6, 0.9)",
    },
    rose: {
      border: "rgba(244, 63, 94, 0.42)",
      bg: "linear-gradient(145deg, rgba(255, 241, 242, 0.96) 0%, rgba(254, 205, 211, 0.9) 100%)",
      fg: "rgba(88, 12, 24, 0.94)",
      sub: "rgba(136, 19, 55, 0.85)",
      glow: "0 0 0 2px rgba(251, 113, 133, 0.3), 0 12px 36px rgba(190, 18, 60, 0.12)",
      ic: "rgba(225, 29, 72, 0.88)",
    },
    red: {
      border: "rgba(220, 38, 38, 0.55)",
      bg: "linear-gradient(145deg, rgba(254, 226, 226, 0.98) 0%, rgba(252, 165, 165, 0.94) 100%)",
      fg: "rgba(69, 10, 10, 0.98)",
      sub: "rgba(127, 29, 29, 0.88)",
      glow: "0 0 0 2px rgba(239, 68, 68, 0.45), 0 14px 40px rgba(185, 28, 28, 0.2)",
      ic: "rgba(185, 28, 28, 0.95)",
    },
    green: {
      border: "rgba(34, 197, 94, 0.45)",
      bg: "linear-gradient(145deg, rgba(240, 253, 244, 0.96) 0%, rgba(187, 247, 208, 0.9) 100%)",
      fg: "rgba(20, 83, 45, 0.95)",
      sub: "rgba(21, 128, 61, 0.8)",
      glow: "0 0 0 2px rgba(74, 222, 128, 0.35), 0 12px 32px rgba(22, 101, 52, 0.1)",
      ic: "rgba(22, 163, 74, 0.9)",
    },
  };

  function runMinimalPill(payload) {
    const tone =
      payload.tone === "rose" ||
      payload.tone === "red" ||
      payload.tone === "green"
        ? payload.tone
        : "amber";
    const th = TONE_STYLES[tone];
    const primary =
      typeof payload.primary === "string" ? payload.primary.trim() : "…";
    const secondary =
      typeof payload.secondary === "string" ? payload.secondary.trim() : "";
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
        right: 14px;
        bottom: 18px;
        z-index: 2147483647;
        max-width: min(280px, calc(100vw - 28px));
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 14px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1.5px solid ${th.border};
        background: ${th.bg};
        box-shadow: ${th.glow};
        color: ${th.fg};
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
      }
      .ic-wrap { flex-shrink: 0; margin-top: 2px; color: ${th.ic}; }
      .col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .p1 { font-size: 13px; font-weight: 650; letter-spacing: 0.01em; line-height: 1.25; }
      .p2 { font-size: 11px; font-weight: 500; line-height: 1.35; color: ${th.sub}; }
    `;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-live", "polite");

    const icWrap = document.createElement("span");
    icWrap.className = "ic-wrap";
    icWrap.innerHTML = DOT_SVG;

    const col = document.createElement("div");
    col.className = "col";
    const t1 = document.createElement("div");
    t1.className = "p1";
    t1.textContent = primary;
    col.appendChild(t1);
    if (secondary) {
      const t2 = document.createElement("div");
      t2.className = "p2";
      t2.textContent = secondary;
      col.appendChild(t2);
    }

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
    const ms = Math.max(350, dismissAt - Date.now());
    autoTimeout = window.setTimeout(teardown, ms);

    shadow.append(style, pill);
    (document.body || document.documentElement).appendChild(host);
  }

  function runDriftCompact(payload) {
    const queueDeltaMin =
      typeof payload.queueDeltaMin === "number" && payload.queueDeltaMin > 0
        ? Math.round(payload.queueDeltaMin)
        : 0;
    const queueTotalMin =
      typeof payload.queueTotalMin === "number"
        ? Math.max(0, Math.round(payload.queueTotalMin))
        : 0;

    function queueCaption() {
      const parts = [];
      if (queueDeltaMin > 0) parts.push(`+${queueDeltaMin}m`);
      parts.push(`~${queueTotalMin}m`);
      return parts.join(" · ");
    }

    const settleEndAt =
      typeof payload.settleEndAt === "number"
        ? payload.settleEndAt
        : Date.now() + 3000;
    const anchorAt =
      typeof payload.anchorAt === "number" ? payload.anchorAt : Date.now();

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
        right: 14px;
        bottom: 18px;
        z-index: 2147483647;
        max-width: min(300px, calc(100vw - 28px));
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 14px;
        border-radius: 999px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: linear-gradient(165deg, rgba(248, 250, 252, 0.94) 0%, rgba(226, 232, 240, 0.88) 100%);
        color: rgba(30, 41, 59, 0.92);
        box-shadow: 0 8px 32px rgba(15, 23, 42, 0.1);
        transition: border-color 0.35s ease, box-shadow 0.35s ease, background 0.35s ease, color 0.3s ease;
      }
      .pill.urgent {
        border-color: rgba(220, 38, 38, 0.55);
        background: linear-gradient(165deg, rgba(254, 226, 226, 0.97) 0%, rgba(252, 165, 165, 0.92) 100%);
        color: rgba(69, 10, 10, 0.96);
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.35), 0 12px 40px rgba(185, 28, 28, 0.18);
      }
      .timer {
        font-size: 12px;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        min-width: 2.4em;
        color: rgba(71, 85, 105, 0.95);
      }
      .pill.urgent .timer { color: rgba(127, 29, 29, 0.95); }
      .main { font-size: 12px; font-weight: 600; line-height: 1.3; flex: 1; min-width: 0; }
      .q { font-size: 10px; font-weight: 500; opacity: 0.78; margin-top: 1px; }
      .pill.urgent .q { opacity: 0.88; }
    `;

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    const timerEl = document.createElement("span");
    timerEl.className = "timer";
    const mainCol = document.createElement("div");
    mainCol.style.flex = "1";
    mainCol.style.minWidth = "0";
    const mainEl = document.createElement("div");
    mainEl.className = "main";
    const qEl = document.createElement("div");
    qEl.className = "q";
    qEl.textContent = queueCaption();
    mainCol.append(mainEl, qEl);
    pill.append(timerEl, mainCol);

    function remainingSec() {
      return Math.max(0, Math.ceil((settleEndAt - Date.now()) / 1000));
    }

    let urgent = Date.now() >= settleEndAt;
    function syncCopy() {
      const r = urgent ? 0 : remainingSec();
      timerEl.textContent = `0:${pad2(r)}`;
      mainEl.textContent = urgent ? "Slow down" : "Pause";
      qEl.textContent = queueCaption();
    }
    syncCopy();
    if (urgent) pill.classList.add("urgent");

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

    autoTimeout = window.setTimeout(
      teardown,
      Math.max(0, anchorAt + 32000 - Date.now()),
    );

    shadow.append(style, pill);
    (document.body || document.documentElement).appendChild(host);
  }

  async function run() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const payload = data[STORAGE_KEY];
    if (!payload || typeof payload !== "object") return;

    if (payload.variant === "minimal") {
      runMinimalPill(payload);
      return;
    }

    if (payload.variant === "reactive_nudge" || payload.variant === "distractor_nudge") {
      runMinimalPill({
        variant: "minimal",
        tone: payload.variant === "distractor_nudge" ? "rose" : "amber",
        primary:
          typeof payload.line1 === "string" && payload.line1.trim()
            ? payload.line1
            : "…",
        secondary:
          typeof payload.line2 === "string" ? payload.line2.trim() : "",
        dismissAt: payload.dismissAt,
      });
      return;
    }

    runDriftCompact(payload);
  }

  void run();
})();
