/**
 * Breakpoint MV3 service worker: tab + navigation signals → chrome.storage.local
 * Dashboard talks via externally_connectable (chrome.runtime.connect / sendMessage).
 *
 * Drift scoring below mirrors breakpoint/lib/driftEngine.ts — keep in sync when tuning.
 * Tab titles are captured on events and refreshed via tabs.onUpdated (YouTube, ChatGPT, etc.).
 * YouTube: youtubeProbe.js reads video.duration; caption transcript → Next API → transcriptBullets on queue events.
 * Drift: centered drift card in band; centered red/rose for clear slip (AI off-focus, distractor heads-up); bottom-right minimal only for ambiguous (wait / title / API).
 */

const STORAGE_SESSION = "breakpoint_active_session";
const STORAGE_EVENTS = "breakpoint_events";
/** Shared payload for in-page overlay.js (chrome.storage.local). */
const STORAGE_LAST_DRIFT_UI = "breakpoint_last_drift_ui";
/** Episode anchor for overlay: same 3s→urgent + 32s teardown across distractor tab switches. */
const STORAGE_OVERLAY_EPISODE = "breakpoint_overlay_episode";
/** After in-page "Continue", block drift + distractor overlays until this timestamp (ms). */
const STORAGE_CONTINUE_SNOOZE_UNTIL = "breakpoint_continue_snooze_until";
/** Cooldown before another drift/distractor intervention after Continue. */
const CONTINUE_SNOOZE_MS = 3 * 60 * 1000;

const QUEUE_TOTAL_CAP_MIN = 180;
/** Per-video ceiling for queue minutes (aligned with breakpoint/lib/researchQueueEstimate.ts). */
const VIDEO_DURATION_MAX_MIN = 120;
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

/** Per-tab debounce (ms) — keep low so first Ctrl+T always shows. */
const REACTIVE_NUDGE_TAB_DEBOUNCE_MS = 100;
/** @type {Map<number, number>} tabId → last nudge time */
let reactiveNudgeLastByTab = new Map();

/** Per-tab throttle for “you landed on a distractor” nudges (SPA can fire often). */
const DISTRACTOR_NUDGE_TAB_MS = 1100;
/** @type {Map<number, number>} */
let distractorNudgeLastByTab = new Map();

/** ChatGPT / Chat: wait for tab title, then classify vs session.goal. */
/** @type {Map<number, { baselineTitle: string; goal: string }>} */
let intentWatchByTabId = new Map();
/** @type {Map<number, ReturnType<typeof setTimeout>>} */
let intentClassifyTimers = new Map();

const CLASSIFY_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

function isIntentGateHost(host) {
  const h = normalizeHost(String(host));
  return h === "chat.openai.com" || h === "chatgpt.com" || h.endsWith(".chatgpt.com");
}

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

function minutesFromVideoDurationSec(sec) {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(
    Math.max(1, Math.ceil(sec / 60)),
    VIDEO_DURATION_MAX_MIN,
  );
}

/** YouTube site or youtu.be link. */
function isYoutubeHostFromEvent(domain, url) {
  const d = domain ? normalizeHost(String(domain)) : "";
  if (d.includes("youtube") || d === "youtube.com" || d.endsWith(".youtube.com"))
    return true;
  const u = url ? String(url) : "";
  if (!u) return false;
  try {
    const h = normalizeHost(new URL(u).hostname);
    return h === "youtu.be" || h.endsWith(".youtu.be");
  } catch {
    return false;
  }
}

function isYoutubeWatchLikeUrl(url) {
  const u = url ? String(url) : "";
  return (
    u.includes("youtube.com/watch") ||
    u.includes("youtube.com/shorts/") ||
    /youtu\.be\//i.test(u)
  );
}

/**
 * @param {{ domain?: string, url?: string, type?: string, videoDurationSec?: number } | null | undefined} e
 */
function shouldProbeVideoDuration(e) {
  if (!e || typeof e !== "object" || e.tabId == null) return false;
  if (e.type !== "TAB_CREATE" && e.type !== "NAVIGATION") return false;
  if (!isYoutubeHostFromEvent(e.domain, e.url)) return false;
  if (e.type === "NAVIGATION" && !isYoutubeWatchLikeUrl(e.url)) return false;
  return true;
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
 * @param {{ domain?: string, url?: string, videoDurationSec?: number }} e
 */
function tabCreateQueueMinutes(e) {
  const d = e?.domain ? normalizeHost(String(e.domain)) : "";
  const url = e?.url ? String(e.url) : "";
  if (!d && !url) return TAB_CREATE_GENERIC_MIN;
  if (isYoutubeHostFromEvent(d || undefined, url)) {
    const m = minutesFromVideoDurationSec(e?.videoDurationSec);
    return m != null ? m : 7;
  }
  if (d && isDistractorHost(d)) return 5;
  if (d && isResearchHintHost(d)) return 4;
  return TAB_CREATE_GENERIC_MIN;
}

/** @param {unknown[]} items */
function estimateQueueDeltaFromBatch(items) {
  if (!Array.isArray(items)) return 0;
  let sum = 0;
  for (const e of items) {
    if (!e || typeof e !== "object") continue;
    if (e.type === "TAB_CREATE") {
      sum += tabCreateQueueMinutes(e);
      continue;
    }
    if (e.type === "NAVIGATION") {
      const url = e.url ? String(e.url) : "";
      if (!isYoutubeWatchLikeUrl(url)) continue;
      const m = minutesFromVideoDurationSec(e.videoDurationSec);
      sum += m != null ? m : 6;
    }
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
      total += tabCreateQueueMinutes(e);
    }
    const d = e.domain ? normalizeHost(String(e.domain)) : "";
    if (e.type === "NAVIGATION") {
      const url = e.url ? String(e.url) : "";
      if (isYoutubeWatchLikeUrl(url)) {
        const m = minutesFromVideoDurationSec(e.videoDurationSec);
        total += m != null ? m : 6;
      } else if (d && isResearchHintHost(d)) total += 3;
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
    if (e.type === "NAVIGATION") {
      const url = e.url ? String(e.url) : "";
      if (isYoutubeWatchLikeUrl(url)) return true;
    }
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

/** Next.js AI route (extension POSTs transcript text; key stays on server). */
const TRANSCRIPT_SUMMARY_URLS = [
  "http://localhost:3000/api/ai/summarize-youtube-transcript",
  "http://127.0.0.1:3000/api/ai/summarize-youtube-transcript",
  "http://localhost:3001/api/ai/summarize-youtube-transcript",
  "http://127.0.0.1:3001/api/ai/summarize-youtube-transcript",
];

/** @type {Set<number>} */
const transcriptSummarizeInflight = new Set();

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
  intentWatchByTabId.clear();
  for (const tid of intentClassifyTimers.values()) clearTimeout(tid);
  intentClassifyTimers.clear();
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

function formatMinimalQueueCaption(meta) {
  const d =
    typeof meta.queueDeltaMin === "number" && meta.queueDeltaMin > 0
      ? Math.round(meta.queueDeltaMin)
      : 0;
  const t =
    typeof meta.queueTotalMin === "number"
      ? Math.max(0, Math.round(meta.queueTotalMin))
      : 0;
  const parts = [];
  if (d > 0) parts.push(`+${d}m`);
  parts.push(`~${t}m`);
  return parts.join(" · ");
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

async function pushMinimalOverlay(tabId, payload) {
  if (tabId == null) return;
  await chrome.storage.local.set({ [STORAGE_LAST_DRIFT_UI]: payload });
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay.js"],
    });
  } catch (e) {
    console.warn("[Breakpoint] overlay inject failed", e);
  }
}

/** Centered in-page card (clear focus-loss); same inject path as drift. */
async function pushCenteredAlert(tabId, payload) {
  if (tabId == null) return;
  await chrome.storage.local.set({ [STORAGE_LAST_DRIFT_UI]: payload });
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay.js"],
    });
  } catch (e) {
    console.warn("[Breakpoint] overlay inject failed", e);
  }
}

async function postClassifyRelevance(goal, tabTitle) {
  const body = JSON.stringify({
    goal: String(goal).slice(0, 800),
    tabTitle: String(tabTitle).slice(0, 400),
  });
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), 22_000);
  try {
    for (const origin of CLASSIFY_ORIGINS) {
      try {
        const r = await fetch(`${origin}/api/ai/classify-tab-relevance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ctrl.signal,
        });
        if (!r.ok) continue;
        const j = await r.json();
        if (typeof j.relevant === "boolean") return j.relevant;
      } catch {
        /* try next origin */
      }
    }
  } finally {
    clearTimeout(kill);
  }
  return null;
}

function scheduleIntentClassify(tabId, goal, title) {
  const prev = intentClassifyTimers.get(tabId);
  if (prev != null) clearTimeout(prev);
  const tid = setTimeout(() => {
    intentClassifyTimers.delete(tabId);
    void runIntentClassify(tabId, goal, title);
  }, 520);
  intentClassifyTimers.set(tabId, tid);
}

async function runIntentClassify(tabId, goal, title) {
  if (!(await trackingActive())) return;
  const rel = await postClassifyRelevance(goal, title);
  const now = Date.now();
  if (rel === true) {
    await pushMinimalOverlay(tabId, {
      variant: "minimal",
      tone: "green",
      primary: "On track",
      secondary: "",
      dismissAt: now + 1600,
    });
    return;
  }
  if (rel === false) {
    await pushCenteredAlert(tabId, {
      variant: "centered_alert",
      tone: "red",
      headline: "Off focus",
      subline: "This tab may not match your goal",
      dismissAt: now + 7000,
    });
    return;
  }
  await pushMinimalOverlay(tabId, {
    variant: "minimal",
    tone: "rose",
    primary: "No check",
    secondary: "Run Next.js for AI",
    dismissAt: now + 3500,
  });
}

async function beginIntentWatch(tabId) {
  if (tabId == null) return;
  const { session, events } = await loadState();
  if (!session?.id || session.endedAt) return;
  const goal = String(session.goal ?? "").trim();
  if (!goal) return;

  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  const url = tab.url || tab.pendingUrl || "";
  if (!isIntentGateHost(hostFromUrl(url))) return;

  const baselineTitle = (tab.title || "").trim();
  if (baselineTitle.length >= 14) {
    scheduleIntentClassify(tabId, goal.slice(0, 500), baselineTitle);
    return;
  }

  intentWatchByTabId.set(tabId, {
    baselineTitle: baselineTitle || "Chat",
    goal: goal.slice(0, 500),
  });

  const last = events.length ? events[events.length - 1] : null;
  const batch =
    last && last.type === "TAB_CREATE" && last.tabId === tabId
      ? [last]
      : [];
  const meta = buildDriftPayload(session, events, batch);
  const q = formatMinimalQueueCaption(meta);
  const secondary =
    q !== "~0m" ? `Waiting on tab title · ${q}` : "Waiting on tab title";

  const now = Date.now();
  await pushMinimalOverlay(tabId, {
    variant: "minimal",
    tone: "amber",
    primary: "…",
    secondary,
    dismissAt: now + 120_000,
  });
}

async function onIntentGateTabUpdated(tabId, changeInfo, tab) {
  if (!(await trackingActive())) return;
  const url = tab.url || tab.pendingUrl || "";
  const host = hostFromUrl(url);

  if (changeInfo.url) {
    if (!isIntentGateHost(host)) {
      intentWatchByTabId.delete(tabId);
      const t = intentClassifyTimers.get(tabId);
      if (t != null) clearTimeout(t);
      intentClassifyTimers.delete(tabId);
      return;
    }
    const w = intentWatchByTabId.get(tabId);
    if (w) {
      w.baselineTitle = (tab.title || "").trim() || w.baselineTitle;
      intentWatchByTabId.set(tabId, w);
    }
    return;
  }

  const w = intentWatchByTabId.get(tabId);
  if (!w) return;
  if (!isIntentGateHost(host)) {
    intentWatchByTabId.delete(tabId);
    return;
  }
  if (!changeInfo.title) return;
  const title = (tab.title || "").trim();
  if (!title || title === w.baselineTitle) return;
  if (title.length < 10) return;

  intentWatchByTabId.delete(tabId);
  scheduleIntentClassify(tabId, w.goal, title);
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
 * Amber pill after a real tab open: queue from events (must run after TAB_CREATE is saved).
 */
async function fireReactiveNudge(tabId) {
  const now = Date.now();
  if (!shouldFireReactiveNudgeOnTab(tabId, now)) return;
  if (!(await tabPageIsInjectableHttps(tabId))) return;

  const { session, events } = await loadState();
  if (!session?.id || session.endedAt) return;

  const last = events.length ? events[events.length - 1] : null;
  const batch =
    last && last.type === "TAB_CREATE" ? [last] : [];
  const meta = buildDriftPayload(session, events, batch);
  const q = formatMinimalQueueCaption(meta);
  const primary = q !== "~0m" ? q : "New tab";

  await pushMinimalOverlay(tabId, {
    variant: "minimal",
    tone: "amber",
    primary,
    secondary: "",
    dismissAt: now + 4000,
  });
}

/**
 * After TAB_CREATE is appended, nudge the same injectable surface as before (opener → last focus → new tab).
 */
async function fireReactiveNudgeAfterCreate(createdTab) {
  if (createdTab.id == null) return;
  let tabId = null;
  if (
    createdTab.openerTabId != null &&
    (await tabPageIsInjectableHttps(createdTab.openerTabId))
  ) {
    tabId = createdTab.openerTabId;
  } else if (
    lastActiveTabId != null &&
    (await tabPageIsInjectableHttps(lastActiveTabId))
  ) {
    tabId = lastActiveTabId;
  } else if (await tabPageIsInjectableHttps(createdTab.id)) {
    tabId = createdTab.id;
  }
  if (tabId == null) return;
  await fireReactiveNudge(tabId);
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
 * Listed high-drift host: same centered Pause + countdown as drift UI (neutral, no “heads up”).
 */
async function fireDistractorSiteNudge(tabId) {
  const now = Date.now();
  if (!shouldFireDistractorNudgeOnTab(tabId, now)) return;
  if (!(await tabPageIsInjectableHttps(tabId))) return;

  const snoozeUntil = (
    await chrome.storage.local.get(STORAGE_CONTINUE_SNOOZE_UNTIL)
  )[STORAGE_CONTINUE_SNOOZE_UNTIL];
  if (typeof snoozeUntil === "number" && Date.now() < snoozeUntil) return;

  const { session, events } = await loadState();
  if (!session?.id || session.endedAt) return;

  const driftMeta = buildDriftPayload(session, events, []);

  await chrome.storage.local.set({
    [STORAGE_LAST_DRIFT_UI]: {
      variant: "drift",
      neutralTone: true,
      dismissKind: "nudge",
      anchorAt: now,
      settleEndAt: now + 2800,
      dwellMs: 180000,
      queueDeltaMin: driftMeta.queueDeltaMin,
      queueTotalMin: driftMeta.queueTotalMin,
      siteLabel: driftMeta.siteLabel,
    },
  });
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
    if (!byTab.has(e.tabId)) byTab.set(e.tabId, true);
  }
  for (const tabId of byTab.keys()) {
    await fireDistractorSiteNudge(tabId);
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

  const snoozeUntil = (
    await chrome.storage.local.get(STORAGE_CONTINUE_SNOOZE_UNTIL)
  )[STORAGE_CONTINUE_SNOOZE_UNTIL];
  if (typeof snoozeUntil === "number" && Date.now() < snoozeUntil) return;

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

function findLatestYoutubeQueueEventIndex(events, tabId) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e || typeof e !== "object" || e.tabId !== tabId) continue;
    if (e.type !== "TAB_CREATE" && e.type !== "NAVIGATION") continue;
    if (!isYoutubeHostFromEvent(e.domain, e.url)) continue;
    if (e.type === "NAVIGATION" && !isYoutubeWatchLikeUrl(e.url)) continue;
    return i;
  }
  return -1;
}

async function probeTabVideoDurationSec(tabId) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const dur = (v) =>
          v && Number.isFinite(v.duration) && v.duration > 1 ? v.duration : 0;
        const inPlayer = document.querySelector("#movie_player video");
        let bestD = dur(inPlayer);
        for (const v of document.querySelectorAll("video")) {
          const d = dur(v);
          if (d > bestD) bestD = d;
        }
        if (bestD <= 0) return null;
        return Math.round(bestD);
      },
    });
    const r = res && res[0] && res[0].result;
    return typeof r === "number" ? r : null;
  } catch {
    return null;
  }
}

/** Ensures youtubeProbe.js runs (tabs opened before install / session need a manual inject). */
async function ensureYoutubeProbeInjected(tabId) {
  if (tabId == null) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["youtubeProbe.js"],
    });
  } catch {
    /* not injectable (e.g. chrome://) */
  }
}

function timedTextJson3ToPlain(json) {
  const events = json?.events;
  if (!Array.isArray(events)) return "";
  const parts = [];
  for (const ev of events) {
    const segs = ev?.segs;
    if (!Array.isArray(segs)) continue;
    for (const s of segs) {
      const u = s?.utf8;
      if (typeof u === "string" && u.trim()) parts.push(u.trim());
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

async function readYoutubeCaptionMetaFromTab(tabId) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        try {
          const ytp = window.ytInitialPlayerResponse;
          if (!ytp) return null;
          const tracks =
            ytp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (!Array.isArray(tracks) || !tracks.length) return null;
          let t = tracks.find((x) => x.languageCode === "en" && !x.kind);
          if (!t) t = tracks.find((x) => x.languageCode === "en");
          if (!t) t = tracks[0];
          const baseUrl = t?.baseUrl;
          if (!baseUrl) return null;
          return {
            baseUrl: String(baseUrl),
            title: String(ytp?.videoDetails?.title ?? ""),
          };
        } catch {
          return null;
        }
      },
    });
    return res?.[0]?.result ?? null;
  } catch {
    return null;
  }
}

async function fetchYoutubeTimedTextPayload(tabId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const meta = await readYoutubeCaptionMetaFromTab(tabId);
    if (!meta?.baseUrl) continue;
    const join = meta.baseUrl.includes("?") ? "&" : "?";
    const url = `${meta.baseUrl}${join}fmt=json3`;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      const text = timedTextJson3ToPlain(j);
      if (text && text.length >= 40) {
        return { text, title: meta.title || "" };
      }
    } catch {
      /* retry */
    }
  }
  return null;
}

async function patchLatestYoutubeQueueEventMerge(tabId, patch) {
  const { session, events } = await loadState();
  if (!session?.id) return;
  const idx = findLatestYoutubeQueueEventIndex(events, tabId);
  if (idx < 0) return;
  const prev = events[idx];
  const copy = events.slice();
  copy[idx] = { ...prev, ...patch };
  await saveState(undefined, copy);
  broadcastState(session, copy);
}

async function postTranscriptBullets(transcript, title) {
  const body = JSON.stringify({
    transcript: String(transcript).slice(0, 24_000),
    title: String(title || "").slice(0, 200),
  });
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), 55_000);
  try {
    for (const url of TRANSCRIPT_SUMMARY_URLS) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ctrl.signal,
        });
        if (!r.ok) continue;
        const j = await r.json();
        if (Array.isArray(j.bullets) && j.bullets.length > 0) return j.bullets;
      } catch {
        /* try next URL */
      }
    }
  } finally {
    clearTimeout(kill);
  }
  return null;
}

async function summarizeYoutubeQueueItem(tabId) {
  if (tabId == null) return;
  if (!(await trackingActive())) return;
  if (transcriptSummarizeInflight.has(tabId)) return;

  const { session, events } = await loadState();
  if (!session?.id) return;
  const idx0 = findLatestYoutubeQueueEventIndex(events, tabId);
  if (idx0 < 0) return;
  const ev0 = events[idx0];
  if (
    ev0.transcriptStatus === "ready" &&
    Array.isArray(ev0.transcriptBullets) &&
    ev0.transcriptBullets.length > 0
  )
    return;
  if (ev0.transcriptStatus === "unavailable") return;

  transcriptSummarizeInflight.add(tabId);
  try {
    await patchLatestYoutubeQueueEventMerge(tabId, {
      transcriptStatus: "loading",
      transcriptError: undefined,
    });

    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      await patchLatestYoutubeQueueEventMerge(tabId, {
        transcriptStatus: "error",
        transcriptError: "Tab closed",
      });
      return;
    }
    const u = tab?.url || tab?.pendingUrl || "";
    if (!isYoutubeHostFromEvent(hostFromUrl(u), u)) {
      await patchLatestYoutubeQueueEventMerge(tabId, {
        transcriptStatus: "unavailable",
        transcriptError: undefined,
      });
      return;
    }

    const payload = await fetchYoutubeTimedTextPayload(tabId);
    if (!payload?.text) {
      await patchLatestYoutubeQueueEventMerge(tabId, {
        transcriptStatus: "unavailable",
        transcriptError:
          "No captions on this video or the page is still loading them.",
      });
      return;
    }

    const bullets = await postTranscriptBullets(payload.text, payload.title);
    if (!bullets) {
      await patchLatestYoutubeQueueEventMerge(tabId, {
        transcriptStatus: "error",
        transcriptError:
          "Could not summarize (run Next.js on :3000 with ANTHROPIC_API_KEY, or try :3001).",
      });
      return;
    }

    const clean = bullets
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .slice(0, 5);
    await patchLatestYoutubeQueueEventMerge(tabId, {
      transcriptStatus: "ready",
      transcriptBullets: clean,
      transcriptError: undefined,
    });
  } catch {
    await patchLatestYoutubeQueueEventMerge(tabId, {
      transcriptStatus: "error",
      transcriptError: "Something went wrong.",
    });
  } finally {
    transcriptSummarizeInflight.delete(tabId);
  }
}

async function patchEventWithVideoDuration(tabId, durationSec) {
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0)
    return;
  const { session, events } = await loadState();
  if (!session?.id) return;
  const idx = findLatestYoutubeQueueEventIndex(events, tabId);
  if (idx < 0) return;
  const prev = events[idx];
  if (
    typeof prev.videoDurationSec === "number" &&
    Number.isFinite(prev.videoDurationSec) &&
    prev.videoDurationSec > 0
  )
    return;
  const copy = events.slice();
  copy[idx] = { ...prev, videoDurationSec: Math.round(durationSec) };
  await saveState(undefined, copy);
  broadcastState(session, copy);

  const freshTotal = estimateQueueTotalFromEvents(copy);
  const newM = minutesFromVideoDurationSec(Math.round(durationSec));
  let oldM = 0;
  if (prev.type === "NAVIGATION" && isYoutubeWatchLikeUrl(String(prev.url || ""))) {
    oldM = minutesFromVideoDurationSec(prev.videoDurationSec) ?? 6;
  } else if (prev.type === "TAB_CREATE") {
    const u = prev.url ? String(prev.url) : "";
    if (isYoutubeHostFromEvent(prev.domain, u)) {
      oldM = minutesFromVideoDurationSec(prev.videoDurationSec) ?? 7;
    }
  }

  const ui = await chrome.storage.local.get(STORAGE_LAST_DRIFT_UI);
  const p = ui[STORAGE_LAST_DRIFT_UI];
  if (p && typeof p === "object" && p.variant === "drift") {
    const patchPayload = { ...p, queueTotalMin: freshTotal };
    if (
      newM != null &&
      typeof p.queueDeltaMin === "number" &&
      oldM >= 0
    ) {
      patchPayload.queueDeltaMin = Math.max(
        0,
        Math.min(
          QUEUE_TOTAL_CAP_MIN,
          Math.round(p.queueDeltaMin - oldM + newM),
        ),
      );
    }
    await chrome.storage.local.set({
      [STORAGE_LAST_DRIFT_UI]: patchPayload,
    });
  }
}

async function tryProbeAndPatchVideoDuration(tabId) {
  if (!(await trackingActive())) return;
  const { session, events } = await loadState();
  if (!session?.id) return;
  const idx = findLatestYoutubeQueueEventIndex(events, tabId);
  if (idx < 0) return;
  const prev = events[idx];
  if (
    typeof prev.videoDurationSec === "number" &&
    Number.isFinite(prev.videoDurationSec) &&
    prev.videoDurationSec > 0
  )
    return;
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  const u = tab?.url || tab?.pendingUrl || "";
  if (!/^https?:\/\//i.test(u)) return;
  if (!isYoutubeHostFromEvent(hostFromUrl(u), u)) return;
  const sec = await probeTabVideoDurationSec(tabId);
  if (sec == null) return;
  await patchEventWithVideoDuration(tabId, sec);
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
  const ytWorkTabs = new Set();
  for (const e of newItems) {
    if (!shouldProbeVideoDuration(e) || e.tabId == null) continue;
    if (ytWorkTabs.has(e.tabId)) continue;
    ytWorkTabs.add(e.tabId);
    void ensureYoutubeProbeInjected(e.tabId).then(() => {
      void tryProbeAndPatchVideoDuration(e.tabId);
      void summarizeYoutubeQueueItem(e.tabId);
    });
  }

  for (const e of newItems) {
    const u = e.url ? String(e.url) : "";
    if (e.tabId != null && u && isIntentGateHost(hostFromUrl(u))) {
      void beginIntentWatch(e.tabId);
    }
  }
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

/** Re-run caption fetch when user focuses a YouTube tab (first load may have been too early). */
async function maybeRetriggerYoutubeTranscriptOnFocus(tabId, url) {
  if (tabId == null || !url) return;
  if (!isYoutubeHostFromEvent(hostFromUrl(url), String(url))) return;
  void ensureYoutubeProbeInjected(tabId).then(() =>
    summarizeYoutubeQueueItem(tabId),
  );
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

  void chrome.tabs
    .query({
      url: [
        "*://www.youtube.com/*",
        "*://youtube.com/*",
        "*://m.youtube.com/*",
        "*://music.youtube.com/*",
        "*://youtu.be/*",
      ],
    })
    .then((ytTabs) => {
      for (const t of ytTabs) {
        if (t.id != null) void ensureYoutubeProbeInjected(t.id);
      }
    })
    .catch(() => {});

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
  await chrome.storage.local.remove([
    STORAGE_OVERLAY_EPISODE,
    STORAGE_CONTINUE_SNOOZE_UNTIL,
  ]);
  return { ok: true };
}

async function handleClearAll() {
  resetTrackingGuards();
  await chrome.storage.local.remove([
    STORAGE_SESSION,
    STORAGE_EVENTS,
    STORAGE_LAST_DRIFT_UI,
    STORAGE_OVERLAY_EPISODE,
    STORAGE_CONTINUE_SNOOZE_UNTIL,
  ]);
  broadcastState(null, []);
  await clearBadge();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "YOUTUBE_VIDEO_DURATION") {
    const tabId = sender.tab?.id;
    const sec = msg.durationSec;
    if (tabId == null || typeof sec !== "number" || !Number.isFinite(sec)) {
      sendResponse({ ok: false });
      return false;
    }
    void patchEventWithVideoDuration(tabId, sec).then(() =>
      sendResponse({ ok: true }),
    );
    return true;
  }
  if (msg?.type === "OVERLAY_DISMISSED") {
    void clearBadge();
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "OVERLAY_NUDGE_DONE") {
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "OVERLAY_CONTINUE_SNOOZE") {
    const snoozeUntil = Date.now() + CONTINUE_SNOOZE_MS;
    void (async () => {
      try {
        await chrome.storage.local.set({
          [STORAGE_CONTINUE_SNOOZE_UNTIL]: snoozeUntil,
        });
        const { events } = await loadState();
        const queueTotalMin = estimateQueueTotalFromEvents(events);
        const ui = await chrome.storage.local.get(STORAGE_LAST_DRIFT_UI);
        const p = ui[STORAGE_LAST_DRIFT_UI];
        const queueDeltaMin =
          p && typeof p.queueDeltaMin === "number" ? p.queueDeltaMin : 0;
        sendResponse({
          ok: true,
          snoozeUntil,
          queueDeltaMin,
          queueTotalMin,
        });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
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
    if (!changeInfo.title && !changeInfo.url && changeInfo.status !== "complete")
      return;
    chrome.tabs.get(tabId, (t) => {
      if (chrome.runtime.lastError || !t) return;
      void patchLatestEventForTab(tabId, t);
      void onIntentGateTabUpdated(tabId, changeInfo, t);
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
        void (async () => {
          await appendEvents([tabToEvent(tab, "TAB_SWITCH")]);
          await maybeRetriggerYoutubeTranscriptOnFocus(tab.id, url);
        })();
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

      void (async () => {
        await appendEvents(events);
        await maybeRetriggerYoutubeTranscriptOnFocus(tab.id, url);
      })();
    });
  });
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (!(await trackingActive())) return;
  if (tab.id == null) return;

  const pushCreate = () => {
    chrome.tabs.get(tab.id, async (t) => {
      if (chrome.runtime.lastError || !t) return;
      const url = t.url || t.pendingUrl;
      if (!url || url === "chrome://newtab/" || url.startsWith("chrome://"))
        return;
      await appendEvents([tabToEvent(t, "TAB_CREATE")]);
      const h = hostFromUrl(String(url));
      if (!isIntentGateHost(h)) void fireReactiveNudgeAfterCreate(t);
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
