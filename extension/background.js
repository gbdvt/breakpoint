/**
 * Breakpoint MV3 service worker: tab + navigation signals → chrome.storage.local
 * Dashboard talks via externally_connectable (chrome.runtime.connect / sendMessage).
 *
 * Drift scoring below mirrors breakpoint/lib/driftEngine.ts — keep in sync when tuning.
 * Tab titles are captured on events and refreshed via tabs.onUpdated (YouTube, ChatGPT, etc.).
 * Drift interventions: in-page overlay + toolbar badge (no separate OS/Chrome popup window).
 */

const STORAGE_SESSION = "breakpoint_active_session";
const STORAGE_EVENTS = "breakpoint_events";
/** Shared payload for in-page overlay.js (chrome.storage.local). */
const STORAGE_LAST_DRIFT_UI = "breakpoint_last_drift_ui";

const DISTRACTOR_ROOTS = [
  "youtube.com",
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

/** @param {unknown[]} items */
function newBatchIndicatesDistractorFocus(items) {
  for (const e of items) {
    if (!e || typeof e !== "object") continue;
    if (e.type === "DISTRACTOR_OPEN") return true;
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

function broadcastState(session, events) {
  const msg = { type: "STATE", session, events };
  for (const port of dashboardPorts) {
    try {
      port.postMessage(msg);
    } catch {
      dashboardPorts.delete(port);
    }
  }
}

function resetTrackingGuards() {
  lastActiveTabId = null;
  lastDistractorTabId = null;
  lastDistractorVisit = {};
  prevShouldIntervene = false;
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

function buildDriftPayload(session, events) {
  const kind = interventionKind(events);
  const last = events[events.length - 1];
  const domain = last?.domain || "unknown";
  const title = last?.title;
  const goalLine = session?.goal ? String(session.goal).slice(0, 140) : "";

  let body =
    kind === "research"
      ? "Lots of new sources quickly — still preparing, or time for one small execution step?"
      : "This looks like a drift pattern away from your stated goal.";

  if (title && title.length > 0) {
    body += ` This tab: “${title.slice(0, 140)}${title.length > 140 ? "…" : ""}”.`;
  } else if (domain && domain !== "unknown") {
    body += ` (${domain})`;
  }

  const headline = kind === "research" ? "Research pile-up" : "Drift signal";
  return { headline, body, goalLine, kind };
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
 * Persist payload and inject the bottom-right in-page card into the best tab
 * (focused distractor, else last distractor tab, else trigger/active).
 */
async function showDriftIntervention(session, events, triggerTabId) {
  const payload = buildDriftPayload(session, events);
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
 * - Overlay when you cross into the band OR each time you land on a distractor tab while still in band.
 */
async function syncDriftIntervention(events, session, triggerTabId, newItems) {
  const score = computeDriftIndex(events);
  const nowBand = shouldIntervene(score);

  if (!nowBand) {
    if (prevShouldIntervene) await clearBadge();
    prevShouldIntervene = false;
    return;
  }

  const crossed = !prevShouldIntervene;
  prevShouldIntervene = true;

  const focusOnDistractor =
    Array.isArray(newItems) && newBatchIndicatesDistractorFocus(newItems);

  if (crossed || focusOnDistractor) {
    await setDriftBadge();
    await showDriftIntervention(session, events, triggerTabId);
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
  await chrome.storage.local.remove(STORAGE_LAST_DRIFT_UI);
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
  return { ok: true };
}

async function handleClearAll() {
  resetTrackingGuards();
  await chrome.storage.local.remove([
    STORAGE_SESSION,
    STORAGE_EVENTS,
    STORAGE_LAST_DRIFT_UI,
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
    const url = tab.url || tab.pendingUrl;
    if (!url || url.startsWith("chrome://") || url.startsWith("edge://")) return;

    const domain = hostFromUrl(url);

    chrome.tabs.get(prevTabId, (prev) => {
      if (chrome.runtime.lastError) {
        void appendEvents([tabToEvent(tab, "TAB_SWITCH")]);
        return;
      }

      const events = [];
      events.push(tabToEvent(tab, "TAB_SWITCH"));

      const prevUrl = prev?.url || prev?.pendingUrl || "";
      const prevHost = prevUrl ? hostFromUrl(prevUrl) : "";

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

  const pushCreate = () => {
    chrome.tabs.get(tab.id, (t) => {
      if (chrome.runtime.lastError || !t) return;
      const url = t.url || t.pendingUrl;
      if (!url || url === "chrome://newtab/" || url.startsWith("chrome://"))
        return;
      void appendEvents([tabToEvent(t, "TAB_CREATE")]);
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

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!(await trackingActive())) return;
  if (details.frameId !== 0) return;
  if (
    details.transitionType === "auto_subframe" ||
    details.transitionType === "manual_subframe"
  )
    return;

  const url = details.url || "";
  if (!url || url.startsWith("chrome://") || url.startsWith("edge://")) return;

  chrome.tabs.get(details.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    void appendEvents([
      {
        timestamp: Date.now(),
        type: "NAVIGATION",
        domain: hostFromUrl(url) || undefined,
        title: tab.title || undefined,
        url,
        tabId: details.tabId,
      },
    ]);
  });
});
