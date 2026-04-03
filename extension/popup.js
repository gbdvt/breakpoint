const DASHBOARD = "http://localhost:3000/";
const EXT_VERSION =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : "";

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function render(state) {
  const root = document.getElementById("root");
  if (!root) return;

  if (!state.ok) {
    root.replaceChildren(
      el(`<p class="err">${state.error || "Could not load state."}</p>`),
    );
    return;
  }

  const { session, eventsCount, score, driftBand, lastDomain, lastTitle } =
    state;

  if (!session || session.endedAt) {
    root.replaceChildren(
      el(`<div class="card"><span class="label">No active session</span>
        <p class="goal">Start one from the dashboard.</p></div>`),
      el(`<a class="btn" href="${DASHBOARD}" target="_blank" rel="noopener">Open dashboard</a>`),
      el(`<p class="muted">Drift load uses the last ~10 events (same as the app).</p>`),
    );
    return;
  }

  const statusClass = driftBand ? "drift-on" : "drift-off";
  const statusText = driftBand ? "Elevated — check tab" : "Below nudge threshold";

  const goal = session.goal
    ? `<p class="goal"><span class="label">Goal</span><br />${escapeHtml(
        String(session.goal).slice(0, 200),
      )}</p>`
    : "";

  const lastBit =
    lastTitle || lastDomain
      ? `<div class="row"><span class="label">Latest</span><span class="value">${escapeHtml(
          (lastTitle || lastDomain || "").slice(0, 90),
        )}</span></div>`
      : "";

  root.replaceChildren(
    el(`<div class="card">
      ${goal}
      <div class="row"><span class="label">Drift load</span><span class="value">${score}</span></div>
      <div class="row"><span class="label">Status</span><span class="value ${statusClass}">${statusText}</span></div>
      <div class="row"><span class="label">Events</span><span class="value">${eventsCount}</span></div>
      ${lastBit}
    </div>`),
    el(
      `<a class="btn" href="${DASHBOARD}" target="_blank" rel="noopener">Open dashboard</a>`,
    ),
    el(
      `<p class="muted">Badge “!” clears when drift load drops. Click here anytime for this readout.</p>`,
    ),
  );
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function load() {
  chrome.runtime.sendMessage({ type: "POPUP_STATE" }, (res) => {
    const err = chrome.runtime.lastError;
    if (err) {
      render({ ok: false, error: err.message });
      return;
    }
    if (!res || res.ok !== true) {
      render({ ok: false, error: res?.error || "Unknown response" });
      return;
    }
    render(res);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const verEl = document.getElementById("ext-version");
  if (verEl && EXT_VERSION) verEl.textContent = `v${EXT_VERSION}`;
  load();
});

