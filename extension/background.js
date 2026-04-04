/**
 * Breakpoint MV3 service worker: tab + navigation signals → chrome.storage.local
 * Dashboard talks via externally_connectable (chrome.runtime.connect / sendMessage).
 *
 * Drift scoring below mirrors breakpoint/lib/driftEngine.ts — keep in sync when tuning.
 * Tab titles are captured on events and refreshed via tabs.onUpdated (YouTube, ChatGPT, etc.).
 * Drift interventions: bottom-right in-page overlay + toolbar badge; light reactive nudge on new tab (Ctrl+T).
 */

const STORAGE_SESSION = "breakpoint_active_session";
const STORAGE_EVENTS = "breakpoint_events";
/** Shared payload for in-page overlay.js (chrome.storage.local). */
const STORAGE_LAST_DRIFT_UI = "breakpoint_last_drift_ui";
/** Episode anchor for overlay: same 3s→urgent + 32s teardown across distractor tab switches. */
const STORAGE_OVERLAY_EPISODE = "breakpoint_overlay_episode";

const QUEUE_TOTAL_CAP_MIN = 180;
/** Drop stale episode so a long gap starts a fresh countdown. */
const OVERLAY_EPISODE_MAX_MS = 40_000;
/** Any new tab adds at least this (unknown URL or generic host) so totals move with real opens. */
const TAB_CREATE_GENERIC_MIN = 2;

const DISTRACTOR_ROOTS = [
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "reddit.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "tiktok.com",
];

/** Matches dashboard research-hint list (for intervention copy only). */
const RESEARCH_HINT_ROOTS = [
  "stackoverflow.com",
  "github.com",
  "developer.mozilla.org",
  "mdn.io",
  "w3.org",
  "npmjs.com",
  "medium.com",
  "dev.to",
];

/**
 * Rich-title sites (ChatGPT, YouTube, Stack Overflow, etc.): document.title often becomes
 * useful after load — tabs.onUpdated patches the latest event for that tabId.
 * Future: route these domains to an LLM with { domain, title, url }.
 */

const RECENT_WINDOW = 10;

/** @type {Set<chrome.runtime.Port>} */
const dashboardPorts = new Set();

let lastActiveTabId = null;
/** Last tab we saw on a distractor domain (YouTube, etc.) — overlay targets this if focus moved away. */
let lastDistractorTabId = null;
/** @type {Record<string, number>} */
let lastDistractorVisit = {};

/** True if last evaluated drift score was in the intervention band (>= threshold). */
let prevShouldIntervene = false;

/** Per-tab debounce only (ms) — avoids duplicate inject glitches, not “user spam”. */
const REACTIVE_NUDGE_TAB_DEBOUNCE_MS = 320;
/** @type {Map<number, number>} tabId → last nudge time */
let reactiveNudgeLastByTab = new Map();

/** Per-tab throttle for “you landed on a distractor” nudges (SPA can fire often). */
const DISTRACTOR_NUDGE_TAB_MS = 2800;
/** @type {Map<number, number>} */
let distractorNudgeLastByTab = new Map();

function normalizeHost(hostname) {
  if (!hostname) return "";
  return String(hostname).replace(/^www\./i, "").toLowerCase();
}

function hostFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "chrome:" || u.protocol === "edge:" || u.protocol === "about:")
      return "";
    return normalizeHost(u.hostname);
  } catch {
    return "";
  }
}

/** URLs where we still log TAB_SWITCH but skip http(s) domain extraction. */
function isBrowserShellUrl(url) {
  if (!url) return true;
  const u = String(url);
  return (
    u.startsWith("chrome://") ||
    u.startsWith("edge://") ||
    u.startsWith("brave://") ||
    u.startsWith("about:") ||
    u.startsWith("devtools://") ||
    u.startsWith("chrome-extension://") ||
    u.startsWith("view-source:")
  );
}

function isDistractorHost(host) {
  if (!host) return false;
  return DISTRACTOR_ROOTS.some(
    (root) => host === root || host.endsWith("." + root),
  );
}

function isResearchHintHost(host) {
  if (!host) return false;
  return RESEARCH_HINT_ROOTS.some(
    (root) => host === root || host.endsWith("." + root),
  );
}

function computeDriftIndex(events) {
  let score = 0;
  const recent = events.slice(-RECENT_WINDOW);

  const tabSwitches = recent.filter((e) => e.type === "TAB_SWITCH").length;
  const tabCreates = recent.filter((e) => e.type === "TAB_CREATE").length;
  const distractorHits = recent.filter(
    (e) => e.domain && isDistractorHost(e.domain),
  ).length;
  const repeatChecks = recent.filter((e) => e.type === "REPEAT_CHECK").length;
  const explicitDistractor = recent.filter(
    (e) => e.type === "DISTRACTOR_OPEN",
  ).length;

  if (tabSwitches >= 3) score += 2;
  if (tabCreates >= 3) score += 2;
  if (distractorHits >= 1 || explicitDistractor >= 1) score += 3;
  if (repeatChecks >= 2) score += 2;

  return score;
}

function shouldIntervene(score) {
  return score >= 5;
}

/**
 * Per TAB_CREATE — aligned with breakpoint/lib/researchQueueEstimate.ts for known hosts;
 * generic/empty domain still counts TAB_CREATE_GENERIC_MIN so session totals track every open.
 */
function tabCreateQueueMinutes(domain) {
  const d = domain ? normalizeHost(String(domain)) : "";
  if (!d) return TAB_CREATE_GENERIC_MIN;
  if (d.includes("youtube") || d === "youtube.com" || d.endsWith(".youtube.com"))
    return 7;
  if (isDistractorHost(d)) return 5;
  if (isResearchHintHost(d)) return 4;
  return TAB_CREATE_GENERIC_MIN;
}

/** @param {unknown[]} items */
function estimateQueueDeltaFromBatch(items) {
  if (!Array.isArray(items)) return 0;
  let sum = 0;
  for (const e of items) {
    if (!e || typeof e !== "object" || e.type !== "TAB_CREATE") continue;
    sum += tabCreateQueueMinutes(e.domain);
  }
  return Math.min(Math.round(sum), QUEUE_TOTAL_CAP_MIN);
}

/** Session-wide hidden-load estimate from stored events. */
function estimateQueueTotalFromEvents(events) {
  if (!Array.isArray(events)) return 0;
  const sorted = [...events].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
  );
  let total = 0;
  for (const e of sorted) {
    if (!e || typeof e !== "object") continue;
    if (e.type === "TAB_CREATE") {
      total += tabCreateQueueMinutes(e.domain);
    }
    const d = e.domain ? normalizeHost(String(e.domain)) : "";
    if (e.type === "NAVIGATION") {
      const url = e.url ? String(e.url) : "";
      if (url.includes("youtube.com/watch")) total += 6;
      else if (d && isResearchHintHost(d)) total += 3;
    }
  }
  return Math.min(Math.round(total), QUEUE_TOTAL_CAP_MIN);
}

/**
 * True when this batch should refresh badge + overlay while already in the drift band.
 * Includes TAB_CREATE so queue totals/delta update when you open tabs (not only on tab switch).
 * @param {unknown[]} items
 */
function newBatchTriggersDriftUi(items) {
  for (const e of items) {
    if (!e || typeof e !== "object") continue;
    if (e.type === "DISTRACTOR_OPEN") return true;
    if (e.type === "TAB_CREATE") return true;
    if (
      e.type === "TAB_SWITCH" &&
      e.domain &&
      isDistractorHost(String(e.domain))
    ) {
      return true;
    }
  }
  return false;
}

function interventionKind(events) {
  const recent = events.slice(-RECENT_WINDOW);
  const tabCreates = recent.filter((e) => e.type === "TAB_CREATE").length;
  const researchOpens = recent.filter(
    (e) =>
      e.type === "TAB_CREATE" &&
      e.domain &&
      (isResearchHintHost(e.domain) || isDistractorHost(e.domain)),
  ).length;

  if (tabCreates >= 3 && researchOpens >= 2) return "research";
  if (tabCreates >= 4) return "research";
  return "reactive";
}

async function loadState() {
  const data = await chrome.storage.local.get([
    STORAGE_SESSION,
    STORAGE_EVENTS,
  ]);
  return {
    session: data[STORAGE_SESSION] ?? null,
    events: Array.isArray(data[STORAGE_EVENTS]) ? data[STORAGE_EVENTS] : [],
  };
}

async function saveState(session, events) {
  const patch = {};
  if (session !== undefined) patch[STORAGE_SESSION] = session;
  if (events !== undefined) patch[STORAGE_EVENTS] = events;
  await chrome.storage.local.set(patch);
}

const DESKTOP_MIRROR_URL = "http://127.0.0.1:17871/breakpoint/state";

function mirrorToDesktop(session, events) {
  try {
    const body = JSON.stringify({ session, events });
    fetch(DESKTOP_MIRROR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* desktop app not running */
  }
}

function broadcastState(session, events) {
  const msg = { type: "STATE", session, events };
  for (const port of dashboardPorts) {
    try {
      port.postMessage(msg);
    } catch {
      dashboardPorts.delete(port);
    }
  }
  mirrorToDesktop(session, events);
}

function resetTrackingGuards() {
  lastActiveTabId = null;
  lastDistractorTabId = null;
  lastDistractorVisit = {};
  prevShouldIntervene = false;
  reactiveNudgeLastByTab = new Map();
  distractorNudgeLastByTab = new Map();
}

/** @param {unknown[]} items */
function rememberDistractorTabsFromEvents(items) {
  for (const e of items) {
    if (
      e &&
      typeof e === "object" &&
      e.tabId != null &&
      e.domain &&
      isDistractorHost(String(e.domain))
    ) {
      lastDistractorTabId = e.tabId;
    }
  }
}

/**
 * @param {chrome.tabs.Tab} tab
 * @param {string} type
 */
function tabToEvent(tab, type) {
  const url = tab.url || tab.pendingUrl || "";
  const domain = url ? hostFromUrl(url) : "";
  /** @type {Record<string, unknown>} */
  const ev = {
    timestamp: Date.now(),
    type,
    domain: domain || undefined,
    title: tab.title || undefined,
    url: url || undefined,
  };
  if (tab.id != null) ev.tabId = tab.id;
  return ev;
}

async function clearBadge() {
  try {
    await chrome.action.setBadgeText({ text: "" });
  } catch {
    /* ignore */
  }
}

async function setDriftBadge() {
  try {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#B45309" });
  } catch {
    /* ignore */
  }
}

function buildDriftPayload(_session, events, newItems) {
  const kind = interventionKind(events);
  const last = events[events.length - 1];
  const rawDomain =
    last?.domain && typeof last.domain === "string"
      ? String(last.domain).replace(/^www\./i, "").trim()
      : "";
  const title =
    last?.title && typeof last.title === "string"
      ? String(last.title).trim()
      : "";

  let siteLabel = rawDomain;
  if (!siteLabel && title) {
    siteLabel = title.length > 42 ? `${title.slice(0, 40)}…` : title;
  }
  if (!siteLabel) siteLabel = "This tab";

  const queueDeltaMin = estimateQueueDeltaFromBatch(
    Array.isArray(newItems) ? newItems : [],
  );
  const queueTotalMin = estimateQueueTotalFromEvents(events);

  return { kind, siteLabel, queueDeltaMin, queueTotalMin };
}

async function tabPageIsInjectableHttps(tabId) {
  try {
    const t = await chrome.tabs.get(tabId);
    const u = t?.url || t?.pendingUrl || "";
    return /^https?:\/\//i.test(u);
  } catch {
    return false;
  }
}

function shouldFireReactiveNudgeOnTab(tabId, now) {
  const prev = reactiveNudgeLastByTab.get(tabId) ?? 0;
  if (now - prev < REACTIVE_NUDGE_TAB_DEBOUNCE_MS) return false;
  reactiveNudgeLastByTab.set(tabId, now);
  if (reactiveNudgeLastByTab.size > 48) {
    const cutoff = now - 120_000;
    for (const [id, t] of reactiveNudgeLastByTab) {
      if (t < cutoff) reactiveNudgeLastByTab.delete(id);
    }
  }
  return true;
}

/**
 * Reactive drift nudge: no session-long cooldown; fires ASAP on new tab.
 * Skipped only when full drift band is active (heavy overlay already).
 */
async function fireReactiveNudge(tabId) {
  const now = Date.now();
  if (!shouldFireReactiveNudgeOnTab(tabId, now)) return;
  if (!(await tabPageIsInjectableHttps(tabId))) return;

  const { session, events } = await loadState();
  if (!session?.id || session.endedAt) return;
  if (shouldIntervene(computeDriftIndex(events))) return;

  const payload = {
    variant: "reactive_nudge",
    line1: "New tab",
    line2: "Drift moves fast — one beat before you click.",
    dismissAt: now + 2400,
    anchorAt: now,
  };
  await chrome.storage.local.set({ [STORAGE_LAST_DRIFT_UI]: payload });

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay.js"],
    });
  } catch (e) {
    console.warn("[Breakpoint] reactive nudge inject failed", e);
  }
}

/**
 * On tabs.onCreated: inject immediately into first injectable tab (opener → last focus → new tab).
 * New tabs are often chrome:// until they load; opener is usually still https.
 */
async function tryReactiveNudgeOnTabCreated(tab) {
  if (tab.id == null) return;

  if (
    tab.openerTabId != null &&
    (await tabPageIsInjectableHttps(tab.openerTabId))
  ) {
    await fireReactiveNudge(tab.openerTabId);
    return;
  }
  if (
    lastActiveTabId != null &&
    (await tabPageIsInjectableHttps(lastActiveTabId))
  ) {
    await fireReactiveNudge(lastActiveTabId);
    return;
  }
  await fireReactiveNudge(tab.id);
}

/** Domain/host label for distractor check (event.domain or parsed from url). */
function eventDistractorHostFromEvent(e) {
  if (!e || typeof e !== "object") return "";
  let d = e.domain ? normalizeHost(String(e.domain)) : "";
  if (!d && e.url) d = hostFromUrl(String(e.url));
  return isDistractorHost(d) ? d : "";
}

function shouldFireDistractorNudgeOnTab(tabId, now) {
  const prev = distractorNudgeLastByTab.get(tabId) ?? 0;
  if (now - prev < DISTRACTOR_NUDGE_TAB_MS) return false;
  distractorNudgeLastByTab.set(tabId, now);
  if (distractorNudgeLastByTab.size > 48) {
    const cutoff = now - 120_000;
    for (const [id, t] of distractorNudgeLastByTab) {
      if (t < cutoff) distractorNudgeLastByTab.delete(id);
    }
  }
  return true;
}

/**
 * In-page heads-up when you land on a listed distractor (even if drift score < threshold).
 * Skipped when full drift intervention is active (heavy overlay already).
 */
async function fireDistractorSiteNudge(tabId, hostLabel) {
  const now = Date.now();
  if (!shouldFireDistractorNudgeOnTab(tabId, now)) return;
  if (!(await tabPageIsInjectableHttps(tabId))) return;

  const { session, events } = await loadState();
  if (!session?.id || session.endedAt) return;
  if (shouldIntervene(computeDriftIndex(events))) return;

  const label =
    hostLabel && String(hostLabel).trim()
      ? String(hostLabel).replace(/^www\./i, "").trim().slice(0, 48)
      : "This site";

  const payload = {
    variant: "distractor_nudge",
    line1: label,
    line2: "High-drift destination — still on purpose?",
    dismissAt: now + 2800,
    anchorAt: now,
  };
  await chrome.storage.local.set({ [STORAGE_LAST_DRIFT_UI]: payload });

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay.js"],
    });
  } catch (e) {
    console.warn("[Breakpoint] distractor nudge inject failed", e);
  }
}

/**
 * After events are merged: nudge once per tab per batch for distractor arrivals.
 * Runs after syncDriftIntervention so we never overwrite the full drift overlay payload.
 */
async function maybeDistractorArrivalNudges(events, newItems) {
  if (!Array.isArray(newItems) || newItems.length === 0) return;
  if (shouldIntervene(computeDriftIndex(events))) return;

  const byTab = new Map();
  for (const e of newItems) {
    if (!e || typeof e !== "object" || e.tabId == null) continue;
    const dh = eventDistractorHostFromEvent(e);
    if (!dh) continue;
    if (!byTab.has(e.tabId)) byTab.set(e.tabId, dh);
  }
  for (const [tabId, hostLabel] of byTab) {
    await fireDistractorSiteNudge(tabId, hostLabel);
  }
}

/**
 * Prefer: focused tab if it’s a distractor → last known distractor tab (e.g. YouTube) → trigger tab → any focused http(s) tab.
 * Fixes injecting into localhost when the score crosses on “switch back to dashboard”.
 */
async function chooseOverlayTabId(triggerTabId) {
  const activeList = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const active = activeList[0];

  if (active?.id && active.url && /^https?:\/\//i.test(active.url)) {
    const h = hostFromUrl(active.url);
    if (isDistractorHost(h)) return active.id;
  }

  if (lastDistractorTabId != null) {
    try {
      const t = await chrome.tabs.get(lastDistractorTabId);
      if (t?.url && /^https?:\/\//i.test(t.url)) return t.id;
    } catch {
      /* tab closed */
    }
  }

  if (triggerTabId != null) {
    try {
      const t = await chrome.tabs.get(triggerTabId);
      if (t?.url && /^https?:\/\//i.test(t.url)) return t.id;
    } catch {
      /* gone */
    }
  }

  if (active?.id && active.url && /^https?:\/\//i.test(active.url)) {
    return active.id;
  }
  return null;
}

/**
 * Persist payload and inject the in-page card (bottom-right) into the best tab
 * (focused distractor, else last distractor tab, else trigger/active).
 * @param {{ crossed?: boolean, newItems?: unknown[] }} [opts]
 */
async function showDriftIntervention(session, events, triggerTabId, opts) {
  const crossed = opts?.crossed === true;
  const newItems = Array.isArray(opts?.newItems) ? opts.newItems : [];
  const now = Date.now();

  const prevEp = (await chrome.storage.local.get(STORAGE_OVERLAY_EPISODE))[
    STORAGE_OVERLAY_EPISODE
  ];
  const epValid =
    prevEp &&
    typeof prevEp.anchorAt === "number" &&
    typeof prevEp.settleEndAt === "number" &&
    now - prevEp.anchorAt < OVERLAY_EPISODE_MAX_MS;

  let anchorAt;
  let settleEndAt;
  if (crossed || !epValid) {
    anchorAt = now;
    settleEndAt = now + 3000;
  } else {
    anchorAt = prevEp.anchorAt;
    settleEndAt = prevEp.settleEndAt;
  }

  await chrome.storage.local.set({
    [STORAGE_OVERLAY_EPISODE]: { anchorAt, settleEndAt },
  });

  const payload = buildDriftPayload(session, events, newItems);
  payload.variant = "drift";
  payload.anchorAt = anchorAt;
  payload.settleEndAt = settleEndAt;
  await chrome.storage.local.set({ [STORAGE_LAST_DRIFT_UI]: payload });

  const tabId = await chooseOverlayTabId(triggerTabId);
  if (tabId == null) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay.js"],
    });
  } catch (e) {
    console.warn("[Breakpoint] overlay inject failed", e);
  }
}

/**
 * Keeps badge + drift UI aligned with the rolling score:
 * - Badge clears when score falls below threshold.
 * - Overlay when you cross into the band, land on a distractor tab, or open a new tab while still in band.
 */
async function syncDriftIntervention(events, session, triggerTabId, newItems) {
  const score = computeDriftIndex(events);
  const nowBand = shouldIntervene(score);

  if (!nowBand) {
    if (prevShouldIntervene) await clearBadge();
    prevShouldIntervene = false;
    await chrome.storage.local.remove(STORAGE_OVERLAY_EPISODE);
    return;
  }

  const crossed = !prevShouldIntervene;
  prevShouldIntervene = true;

  const driftUiFromBatch =
    Array.isArray(newItems) && newBatchTriggersDriftUi(newItems);

  if (crossed || driftUiFromBatch) {
    await setDriftBadge();
    await showDriftIntervention(session, events, triggerTabId, {
      crossed,
      newItems: Array.isArray(newItems) ? newItems : [],
    });
  }
}

async function appendEvents(newItems) {
  const { session, events } = await loadState();
  if (!session?.id) return;
  rememberDistractorTabsFromEvents(newItems);
  const triggerTabId = [...newItems]
    .reverse()
    .find((e) => e && typeof e === "object" && e.tabId != null)?.tabId;
  const next = events.concat(newItems);
  await saveState(undefined, next);
  broadcastState(session, next);
  await syncDriftIntervention(next, session, triggerTabId, newItems);
  await maybeDistractorArrivalNudges(next, newItems);
}

/**
 * When the document title updates (SPA / lazy title), patch the latest event for this tabId.
 */
async function patchLatestEventForTab(tabId, tab) {
  const { session, events } = await loadState();
  if (!session?.id) return;

  const title = tab.title;
  const url = tab.url || tab.pendingUrl;
  if (!title && !url) return;

  let idx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].tabId === tabId) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return;

  const prev = events[idx];
  const nextTitle = title || prev.title;
  const nextUrl = url || prev.url;
  if (nextTitle === prev.title && nextUrl === prev.url) return;

  const copy = events.slice();
  copy[idx] = {
    ...prev,
    title: nextTitle || prev.title,
    url: nextUrl || prev.url,
    domain: nextUrl ? hostFromUrl(nextUrl) || prev.domain : prev.domain,
  };

  await saveState(undefined, copy);
  broadcastState(session, copy);
}

async function trackingActive() {
  const { session } = await loadState();
  return !!(session && session.id && !session.endedAt);
}

async function handleSessionStart(session) {
  resetTrackingGuards();
  await clearBadge();
  await saveState(session, []);
  await chrome.storage.local.remove([
    STORAGE_LAST_DRIFT_UI,
    STORAGE_OVERLAY_EPISODE,
  ]);
  broadcastState(session, []);

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  lastActiveTabId = tabs[0]?.id ?? null;

  return { ok: true };
}

async function handleSessionEnd() {
  const { session, events } = await loadState();
  if (session) {
    session.endedAt = Date.now();
    await saveState(session, events);
    broadcastState(session, events);
  }
  resetTrackingGuards();
  await clearBadge();
  await chrome.storage.local.remove(STORAGE_OVERLAY_EPISODE);
  return { ok: true };
}

async function handleClearAll() {
  resetTrackingGuards();
  await chrome.storage.local.remove([
    STORAGE_SESSION,
    STORAGE_EVENTS,
    STORAGE_LAST_DRIFT_UI,
    STORAGE_OVERLAY_EPISODE,
  ]);
  broadcastState(null, []);
  await clearBadge();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "OVERLAY_DISMISSED") {
    void clearBadge();
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "OVERLAY_NUDGE_DONE") {
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "POPUP_STATE") {
    loadState()
      .then(({ session: s, events: ev }) => {
        const score = computeDriftIndex(ev);
        const last = ev.length ? ev[ev.length - 1] : null;
        sendResponse({
          ok: true,
          session: s,
          eventsCount: ev.length,
          score,
          driftBand: shouldIntervene(score),
          lastDomain: last?.domain ?? null,
          lastTitle: last?.title
            ? String(last.title).slice(0, 100)
            : null,
        });
      })
      .catch((e) =>
        sendResponse({ ok: false, error: String(e?.message || e) }),
      );
    return true;
  }
  return false;
});

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== "breakpoint-dashboard") return;
  dashboardPorts.add(port);
  port.onDisconnect.addListener(() => dashboardPorts.delete(port));
  loadState().then(({ session, events }) => {
    port.postMessage({ type: "STATE", session, events });
  });
});

chrome.runtime.onMessageExternal.addListener((request, _sender, sendResponse) => {
  const run = async () => {
    if (request?.type === "SESSION_START" && request.session) {
      return handleSessionStart(request.session);
    }
    if (request?.type === "SESSION_END") {
      return handleSessionEnd();
    }
    if (request?.type === "CLEAR_ALL") {
      return handleClearAll();
    }
    if (request?.type === "GET_STATE") {
      const { session, events } = await loadState();
      return { ok: true, session, events };
    }
    return { ok: false, error: "unknown_message" };
  };
  run()
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void (async () => {
    if (!(await trackingActive())) return;
    if (!changeInfo.title && !changeInfo.url) return;
    chrome.tabs.get(tabId, (t) => {
      if (chrome.runtime.lastError || !t) return;
      void patchLatestEventForTab(tabId, t);
    });
  })();
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!(await trackingActive())) return;

  const tabId = activeInfo.tabId;
  if (lastActiveTabId === null) {
    lastActiveTabId = tabId;
    return;
  }
  if (tabId === lastActiveTabId) return;

  const prevTabId = lastActiveTabId;
  lastActiveTabId = tabId;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    const url = tab.url || tab.pendingUrl || "";

    if (isBrowserShellUrl(url)) {
      void appendEvents([
        {
          timestamp: Date.now(),
          type: "TAB_SWITCH",
          tabId: tab.id,
          title: tab.title || undefined,
          url: url || undefined,
        },
      ]);
      return;
    }

    const domain = hostFromUrl(url);

    chrome.tabs.get(prevTabId, (prev) => {
      if (chrome.runtime.lastError) {
        void appendEvents([tabToEvent(tab, "TAB_SWITCH")]);
        return;
      }

      const events = [];
      events.push(tabToEvent(tab, "TAB_SWITCH"));

      const prevUrl = prev?.url || prev?.pendingUrl || "";
      const prevHost = prevUrl && !isBrowserShellUrl(prevUrl) ? hostFromUrl(prevUrl) : "";

      if (isDistractorHost(domain) && !isDistractorHost(prevHost)) {
        events.push({
          timestamp: Date.now(),
          type: "DISTRACTOR_OPEN",
          domain,
          title: tab.title || undefined,
          url,
          tabId: tab.id,
        });
      }

      if (isDistractorHost(domain)) {
        const now = Date.now();
        const last = lastDistractorVisit[domain];
        if (last && now - last < 120_000) {
          events.push({
            timestamp: now,
            type: "REPEAT_CHECK",
            domain,
            title: tab.title || undefined,
            url,
            tabId: tab.id,
          });
        }
        lastDistractorVisit[domain] = now;
      }

      void appendEvents(events);
    });
  });
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (!(await trackingActive())) return;
  if (tab.id == null) return;

  void tryReactiveNudgeOnTabCreated(tab);

  const pushCreate = () => {
    chrome.tabs.get(tab.id, (t) => {
      if (chrome.runtime.lastError || !t) return;
      const url = t.url || t.pendingUrl;
      if (!url || url === "chrome://newtab/" || url.startsWith("chrome://"))
        return;
      void appendEvents([tabToEvent(t, "TAB_CREATE")]);
      void fireReactiveNudge(t.id);
    });
  };

  if (tab.pendingUrl || (tab.url && !tab.url.startsWith("chrome://"))) {
    pushCreate();
  } else {
    const listener = (id, info, updated) => {
      if (id !== tab.id) return;
      if (info.url || info.pendingUrl || info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        pushCreate();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => chrome.tabs.onUpdated.removeListener(listener), 15_000);
  }
});

/** Desktop app (Tauri) queues SESSION_START / SESSION_END here — no browser tab needed. */
const DESKTOP_POLL_URL = "http://127.0.0.1:17871/breakpoint/poll";

function pollDesktopCommandQueue() {
  void (async () => {
    try {
      const r = await fetch(DESKTOP_POLL_URL);
      if (!r.ok) return;
      const j = await r.json();
      if (j == null || j.command == null || j.command === "") return;
      if (j.command === "SESSION_START" && j.session) {
        await handleSessionStart(j.session);
        return;
      }
      if (j.command === "SESSION_END") {
        await handleSessionEnd();
        return;
      }
      if (j.command === "CLEAR_ALL") {
        await handleClearAll();
        return;
      }
    } catch {
      /* desktop not running */
    }
  })();
}

setInterval(pollDesktopCommandQueue, 1200);

function appendMainFrameNavigation(tabId, url) {
  if (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("brave://")
  )
    return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    void appendEvents([
      {
        timestamp: Date.now(),
        type: "NAVIGATION",
        domain: hostFromUrl(url) || undefined,
        title: tab.title || undefined,
        url,
        tabId,
      },
    ]);
  });
}

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!(await trackingActive())) return;
  if (details.frameId !== 0) return;
  if (
    details.transitionType === "auto_subframe" ||
    details.transitionType === "manual_subframe"
  )
    return;

  const url = details.url || "";
  appendMainFrameNavigation(details.tabId, url);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  if (!(await trackingActive())) return;
  if (details.frameId !== 0) return;
  const url = details.url || "";
  appendMainFrameNavigation(details.tabId, url);
});
