const DASHBOARD = "http://localhost:3000/";
const EXT_VERSION =
  typeof chrome !== "undefined" && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : "";

const WARN_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 5.5L4 19h16L12 5.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M12 10v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="16.5" r="0.75" fill="currentColor"/>
</svg>`;

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function faviconUrl(domain) {
  const d = String(domain || "")
    .replace(/^www\./i, "")
    .trim();
  if (!d) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=32`;
}

function displaySite(state) {
  const d = state.lastDomain;
  if (d) return d;
  const t = state.lastTitle;
  if (t) {
    const s = String(t);
    return s.length > 44 ? `${s.slice(0, 44)}…` : s;
  }
  return "This tab";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(state) {
  const root = document.getElementById("root");
  if (!root) return;

  const dashTitle =
    EXT_VERSION ? `Open Breakpoint (v${EXT_VERSION})` : "Open Breakpoint";
  const dashLink = `<a class="subtle" href="${DASHBOARD}" target="_blank" rel="noopener" title="${escapeHtml(dashTitle)}">Open Breakpoint</a>`;

  if (!state.ok) {
    root.replaceChildren(
      el(`<p class="err">${escapeHtml(state.error || "Could not load state.")}</p>`),
      el(dashLink),
    );
    return;
  }

  const { session, driftBand } = state;

  if (!session || session.endedAt) {
    root.replaceChildren(
      el(`<div class="pill pill-idle">No active session</div>`),
      el(dashLink),
    );
    return;
  }

  const site = escapeHtml(displaySite(state));
  const fav = state.lastDomain ? faviconUrl(state.lastDomain) : "";

  if (driftBand) {
    const lead =
      fav !== ""
        ? `<img class="fav" src="${escapeHtml(fav)}" alt="" width="18" height="18" />`
        : `<span class="pill-icon" style="color:rgba(120,20,30,0.9)">${WARN_SVG}</span>`;
    root.replaceChildren(
      el(`<div class="pill pill--alert">
        ${lead}
        <span class="pill-main">${site} — Distraction logged</span>
      </div>`),
      el(dashLink),
    );
    return;
  }

  const img = fav
    ? `<img class="fav" src="${escapeHtml(fav)}" alt="" width="18" height="18" />`
    : "";
  root.replaceChildren(
    el(`<div class="pill">
      ${img}
      <span class="pill-main">${site} — Session active</span>
    </div>`),
    el(dashLink),
  );
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
  load();
});
