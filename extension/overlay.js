/**
 * variant "minimal" — bottom-right only (ambiguous: waiting, API down, on-track ping).
 * variant "centered_alert" — centered card for clear focus loss (off-focus AI, distractor heads-up).
 * variant "drift" — centered settle → urgent + queue (intervention band).
 */
(function () {
  const ROOT_ID = "breakpoint-drift-overlay-root";
  const STORAGE_KEY = "breakpoint_last_drift_ui";
  /** Placeholder “tasks” horizon for distracted vs workload (hours). */
  const TASK_HORIZON_HOURS = 2;

  const DOT_SVG = `<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.85"/></svg>`;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatTimeWasted(sec) {
    const s = Math.max(0, Math.floor(sec));
    if (s < 60) return `${s}s distracted`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r > 0 ? `${m}m ${r}s distracted` : `${m}m distracted`;
  }

  function formatDistractedVsTasks(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = TASK_HORIZON_HOURS;
    if (s < 60) return `${s}s / ${h}h`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (r === 0) return `${m}m / ${h}h`;
    return `${m}m ${r}s / ${h}h`;
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

  /** Centered modal-style alert; does not clear toolbar badge on dismiss (nudge path). */
  function runCenteredAlert(payload) {
    const tone =
      payload.tone === "rose" || payload.tone === "red" ? payload.tone : "red";
    const th = TONE_STYLES[tone];
    const headline =
      typeof payload.headline === "string" ? payload.headline.trim() : "…";
    const subline =
      typeof payload.subline === "string" ? payload.subline.trim() : "";
    const dismissAt =
      typeof payload.dismissAt === "number"
        ? payload.dismissAt
        : Date.now() + 5000;

    document.getElementById(ROOT_ID)?.remove();

    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-breakpoint-overlay", "true");
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(15, 23, 42, 0.14);
        pointer-events: none;
      }
      .card {
        position: fixed;
        left: 50%;
        top: 42%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        width: min(400px, calc(100vw - 40px));
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
        padding: 26px 28px 24px;
        border-radius: 22px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1.5px solid ${th.border};
        background: ${th.bg};
        box-shadow:
          ${th.glow},
          0 20px 50px rgba(15, 23, 42, 0.12);
        color: ${th.fg};
      }
      .h { font-size: 22px; font-weight: 750; line-height: 1.2; letter-spacing: -0.02em; }
      .s { font-size: 14px; font-weight: 600; line-height: 1.35; color: ${th.sub}; max-width: 320px; }
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "alert");

    const h = document.createElement("div");
    h.className = "h";
    h.textContent = headline;
    card.appendChild(h);
    if (subline) {
      const s = document.createElement("div");
      s.className = "s";
      s.textContent = subline;
      card.appendChild(s);
    }

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
    autoTimeout = window.setTimeout(
      teardown,
      Math.max(400, dismissAt - Date.now()),
    );

    shadow.append(style, backdrop, card);
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

    function queueCaptionFor(dMin, tMin) {
      const d =
        typeof dMin === "number" && dMin > 0 ? Math.round(dMin) : 0;
      const t =
        typeof tMin === "number" ? Math.max(0, Math.round(tMin)) : 0;
      const parts = [];
      if (d > 0) parts.push(`+${d}m`);
      parts.push(`~${t}m`);
      return parts.join(" · ");
    }

    function queueCaption() {
      return queueCaptionFor(queueDeltaMin, queueTotalMin);
    }

    const settleEndAt =
      typeof payload.settleEndAt === "number"
        ? payload.settleEndAt
        : Date.now() + 3000;
    const anchorAt =
      typeof payload.anchorAt === "number" ? payload.anchorAt : Date.now();

    const neutralTone = payload.neutralTone === true;
    const dismissKind =
      payload.dismissKind === "nudge" ? "nudge" : "drift";
    const cap = queueCaption();
    const hideQueueRow =
      cap === "~0m" || (queueDeltaMin <= 0 && queueTotalMin <= 0);

    document.getElementById(ROOT_ID)?.remove();

    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-breakpoint-overlay", "true");
    const shadow = host.attachShadow({ mode: "open" });

    const siteRaw =
      typeof payload.siteLabel === "string" ? payload.siteLabel.trim() : "";
    const loggedLine = siteRaw
      ? `${siteRaw.length > 34 ? `${siteRaw.slice(0, 32)}…` : siteRaw} — Distraction logged`
      : "Distraction logged";

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      @keyframes driftPulse {
        0%, 100% {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.2) inset,
            0 0 48px rgba(239, 68, 68, 0.42),
            0 0 96px rgba(220, 38, 38, 0.18),
            0 20px 50px rgba(127, 29, 29, 0.35);
        }
        50% {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.28) inset,
            0 0 64px rgba(248, 113, 113, 0.55),
            0 0 120px rgba(239, 68, 68, 0.28),
            0 24px 56px rgba(153, 27, 27, 0.4);
        }
      }
      @keyframes driftPulseUrgent {
        0%, 100% {
          box-shadow:
            0 0 0 1px rgba(254, 202, 202, 0.5) inset,
            0 0 56px rgba(239, 68, 68, 0.55),
            0 0 100px rgba(220, 38, 38, 0.32),
            0 22px 60px rgba(127, 29, 29, 0.45);
        }
        50% {
          box-shadow:
            0 0 0 1px rgba(254, 226, 226, 0.65) inset,
            0 0 72px rgba(248, 113, 113, 0.65),
            0 0 140px rgba(239, 68, 68, 0.38),
            0 26px 64px rgba(185, 28, 28, 0.5);
        }
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: radial-gradient(ellipse 75% 55% at 50% 38%, rgba(239, 68, 68, 0.22) 0%, rgba(88, 28, 28, 0.35) 45%, rgba(15, 23, 42, 0.72) 100%);
        pointer-events: none;
      }
      .drift-card {
        position: fixed;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        width: min(340px, calc(100vw - 40px));
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
        padding: 20px 22px 22px;
        border-radius: 20px;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        border: 1.5px solid rgba(252, 165, 165, 0.85);
        background: linear-gradient(165deg, rgba(254, 226, 226, 0.97) 0%, rgba(252, 165, 165, 0.9) 42%, rgba(248, 113, 113, 0.82) 100%);
        color: rgba(69, 10, 10, 0.98);
        animation: driftPulse 2.2s ease-in-out infinite;
      }
      .drift-card.urgent {
        border-color: rgba(248, 113, 113, 0.95);
        background: linear-gradient(168deg, rgba(254, 202, 202, 0.99) 0%, rgba(252, 165, 165, 0.96) 38%, rgba(239, 68, 68, 0.88) 100%);
        animation: driftPulseUrgent 1.8s ease-in-out infinite;
      }
      .logged {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: 0.02em;
        color: rgba(127, 29, 29, 0.98);
        text-shadow:
          0 0 20px rgba(254, 202, 202, 0.95),
          0 0 36px rgba(248, 113, 113, 0.65),
          0 1px 2px rgba(69, 10, 10, 0.35);
        max-width: 100%;
        padding: 0 6px;
      }
      .drift-card.urgent .logged {
        color: rgba(69, 10, 10, 1);
        text-shadow:
          0 0 24px rgba(252, 165, 165, 1),
          0 0 48px rgba(239, 68, 68, 0.55),
          0 1px 3px rgba(69, 10, 10, 0.45);
      }
      .timer {
        font-size: 40px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.04em;
        line-height: 1;
        color: rgba(153, 27, 27, 0.98);
        text-shadow: 0 0 28px rgba(248, 113, 113, 0.75), 0 2px 8px rgba(127, 29, 29, 0.25);
      }
      .drift-card.urgent .timer {
        color: rgba(127, 29, 29, 1);
        text-shadow: 0 0 32px rgba(239, 68, 68, 0.85), 0 2px 10px rgba(69, 10, 10, 0.3);
      }
      .main {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(185, 28, 28, 0.92);
        line-height: 1.2;
        text-shadow: 0 0 16px rgba(252, 165, 165, 0.8);
      }
      .drift-card.urgent .main {
        color: rgba(127, 29, 29, 0.98);
        text-shadow: 0 0 20px rgba(248, 113, 113, 0.9);
      }
      .q {
        font-size: 12px;
        font-weight: 600;
        color: rgba(127, 29, 29, 0.88);
        margin-top: 2px;
        text-shadow: 0 0 12px rgba(254, 202, 202, 0.6);
      }
      .drift-card.urgent .q {
        color: rgba(69, 10, 10, 0.95);
      }
      .continue-btn {
        margin-top: 4px;
        padding: 6px 16px;
        border-radius: 999px;
        border: 1px solid rgba(127, 29, 29, 0.4);
        background: rgba(255, 255, 255, 0.5);
        color: rgba(127, 29, 29, 0.95);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(239, 68, 68, 0.2);
      }
      .continue-btn:hover {
        background: rgba(255, 255, 255, 0.72);
      }
      .continue-btn:focus-visible {
        outline: 2px solid rgba(127, 29, 29, 0.85);
        outline-offset: 2px;
      }
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const pill = document.createElement("div");
    pill.className = "drift-card";
    pill.setAttribute("role", "alert");
    const loggedEl = document.createElement("div");
    loggedEl.className = "logged";
    loggedEl.textContent = loggedLine;
    const timerEl = document.createElement("span");
    timerEl.className = "timer";
    const mainEl = document.createElement("div");
    mainEl.className = "main";
    mainEl.textContent = "Pause";
    const qEl = document.createElement("div");
    qEl.className = "q";
    if (hideQueueRow) {
      qEl.style.display = "none";
    } else {
      qEl.textContent = queueCaption();
    }
    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "continue-btn";
    continueBtn.textContent = "Continue";
    continueBtn.setAttribute(
      "aria-label",
      "Continue — snooze interventions; show time and queue",
    );
    pill.append(loggedEl, timerEl, mainEl, qEl, continueBtn);

    function remainingSec() {
      return Math.max(0, Math.ceil((settleEndAt - Date.now()) / 1000));
    }

    function syncCopy() {
      const sec = remainingSec();
      timerEl.textContent = `0:${pad2(sec)}`;
      mainEl.textContent = "Pause";
      if (!hideQueueRow) {
        qEl.textContent = queueCaption();
        try {
          chrome.storage.local.get(STORAGE_KEY, (data) => {
            const p = data[STORAGE_KEY];
            if (!p || tornDown) return;
            const d =
              typeof p.queueDeltaMin === "number"
                ? p.queueDeltaMin
                : queueDeltaMin;
            const t =
              typeof p.queueTotalMin === "number"
                ? p.queueTotalMin
                : queueTotalMin;
            const cap = queueCaptionFor(d, t);
            if (cap !== "~0m") qEl.textContent = cap;
          });
        } catch {
          /* ignore */
        }
      }
    }

    /** How long the light snooze chip stays visible (cooldown continues in background). */
    const SNOOZE_CHIP_DISPLAY_MS = 8_000;

    let tornDown = false;
    /** @type {"drift" | "summary" | "done"} */
    let phase = "drift";
    let intervalId = 0;
    let autoTimeout = 0;

    function finalizeComplete() {
      if (tornDown) return;
      tornDown = true;
      phase = "done";
      if (intervalId) window.clearInterval(intervalId);
      intervalId = 0;
      window.removeEventListener("pagehide", onPageHide);
      if (autoTimeout) window.clearTimeout(autoTimeout);
      autoTimeout = 0;
      host.remove();
      try {
        chrome.runtime.sendMessage({
          type:
            dismissKind === "nudge"
              ? "OVERLAY_NUDGE_DONE"
              : "OVERLAY_DISMISSED",
        });
      } catch {
        /* ignore */
      }
    }

    function onPageHide() {
      finalizeComplete();
    }

    function onContinueClick() {
      if (tornDown || phase !== "drift") return;
      phase = "summary";
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = 0;
      }
      if (autoTimeout) {
        window.clearTimeout(autoTimeout);
        autoTimeout = 0;
      }

      try {
        chrome.runtime.sendMessage({ type: "OVERLAY_CONTINUE_SNOOZE" }, (res) => {
          if (tornDown) return;
          void chrome.runtime.lastError;
          if (!res?.ok || typeof res.snoozeUntil !== "number") {
            finalizeComplete();
            return;
          }

          while (shadow.firstChild) shadow.firstChild.remove();

          const wastedSec = Math.max(
            0,
            Math.round((Date.now() - anchorAt) / 1000),
          );
          const d =
            typeof res.queueDeltaMin === "number"
              ? res.queueDeltaMin
              : queueDeltaMin;
          const t =
            typeof res.queueTotalMin === "number"
              ? res.queueTotalMin
              : queueTotalMin;
          const queueLine = queueCaptionFor(d, t);
          const showQueueLine = queueLine !== "~0m";

          const chipStyle = document.createElement("style");
          chipStyle.textContent = `
            * { box-sizing: border-box; }
            .snooze-chip {
              position: fixed;
              right: 14px;
              bottom: 18px;
              z-index: 2147483647;
              font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
              -webkit-font-smoothing: antialiased;
              color: rgba(51, 65, 85, 0.96);
              background: rgba(248, 250, 252, 0.92);
              border: 1px solid rgba(148, 163, 184, 0.4);
              border-radius: 8px;
              padding: 7px 11px;
              box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
              -webkit-backdrop-filter: blur(10px);
              backdrop-filter: blur(10px);
              max-width: min(260px, calc(100vw - 28px));
            }
            .chip-line1 {
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.02em;
              line-height: 1.35;
            }
            .chip-linevs {
              margin-top: 2px;
              font-size: 9px;
              font-weight: 500;
              letter-spacing: 0.04em;
              color: rgba(100, 116, 139, 0.82);
              line-height: 1.25;
            }
            .chip-line2 {
              margin-top: 3px;
              font-size: 10px;
              font-weight: 500;
              color: rgba(71, 85, 105, 0.88);
              line-height: 1.3;
            }
          `;
          const chip = document.createElement("div");
          chip.className = "snooze-chip";
          chip.setAttribute("role", "status");
          chip.setAttribute("aria-live", "polite");
          const line1El = document.createElement("div");
          line1El.className = "chip-line1";
          line1El.textContent = formatTimeWasted(wastedSec);
          chip.appendChild(line1El);
          const vsEl = document.createElement("div");
          vsEl.className = "chip-linevs";
          vsEl.textContent = formatDistractedVsTasks(wastedSec);
          chip.appendChild(vsEl);
          if (showQueueLine) {
            const line2El = document.createElement("div");
            line2El.className = "chip-line2";
            line2El.textContent = queueLine;
            chip.appendChild(line2El);
          }
          shadow.append(chipStyle, chip);

          autoTimeout = window.setTimeout(() => {
            autoTimeout = 0;
            finalizeComplete();
          }, SNOOZE_CHIP_DISPLAY_MS);
        });
      } catch {
        finalizeComplete();
      }
    }

    window.addEventListener("pagehide", onPageHide);
    continueBtn.addEventListener("click", onContinueClick);

    if (neutralTone) {
      syncCopy();
      intervalId = window.setInterval(syncCopy, 200);
      const dwellMs =
        typeof payload.dwellMs === "number" && payload.dwellMs > 400
          ? payload.dwellMs
          : 3600;
      autoTimeout = window.setTimeout(
        finalizeComplete,
        Math.max(500, anchorAt + dwellMs - Date.now()),
      );
    } else {
      let urgent = Date.now() >= settleEndAt;
      syncCopy();
      if (urgent) pill.classList.add("urgent");

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
      } else {
        syncCopy();
      }

      autoTimeout = window.setTimeout(
        finalizeComplete,
        Math.max(0, anchorAt + 32000 - Date.now()),
      );
    }

    shadow.append(style, backdrop, pill);
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

    if (payload.variant === "reactive_nudge") {
      runMinimalPill({
        variant: "minimal",
        tone: "amber",
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

    if (payload.variant === "distractor_nudge") {
      const n = Date.now();
      runDriftCompact({
        variant: "drift",
        neutralTone: true,
        dismissKind: "nudge",
        siteLabel:
          typeof payload.siteLabel === "string" ? payload.siteLabel : "",
        anchorAt:
          typeof payload.anchorAt === "number" ? payload.anchorAt : n,
        settleEndAt:
          typeof payload.settleEndAt === "number"
            ? payload.settleEndAt
            : n + 2800,
        dwellMs:
          typeof payload.dwellMs === "number" && payload.dwellMs > 400
            ? payload.dwellMs
            : 180000,
        queueDeltaMin:
          typeof payload.queueDeltaMin === "number"
            ? payload.queueDeltaMin
            : 0,
        queueTotalMin:
          typeof payload.queueTotalMin === "number"
            ? payload.queueTotalMin
            : 0,
      });
      return;
    }

    if (payload.variant === "centered_alert") {
      runCenteredAlert(payload);
      return;
    }

    runDriftCompact(payload);
  }

  void run();
})();
