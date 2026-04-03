/**
 * Breakpoint MV3 service worker: tab + navigation signals → chrome.storage.local
 * Dashboard talks via externally_connectable (chrome.runtime.connect / sendMessage).
 */

const STORAGE_SESSION = "breakpoint_active_session";
const STORAGE_EVENTS = "breakpoint_events";

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

/** @type {Set<chrome.runtime.Port>} */
const dashboardPorts = new Set();

let lastActiveTabId = null;
/** @type {Record<string, number>} */
let lastDistractorVisit = {};

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

async function appendEvents(newItems) {
  const { session, events } = await loadState();
  if (!session?.id) return;
  const next = events.concat(newItems);
  await saveState(undefined, next);
  broadcastState(session, next);
}

async function trackingActive() {
  const { session } = await loadState();
  return !!(session && session.id && !session.endedAt);
}

function resetTrackingGuards() {
  lastActiveTabId = null;
  lastDistractorVisit = {};
}

async function handleSessionStart(session) {
  resetTrackingGuards();
  await saveState(session, []);
  broadcastState(session, []);
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
  return { ok: true };
}

async function handleClearAll() {
  resetTrackingGuards();
  await chrome.storage.local.remove([STORAGE_SESSION, STORAGE_EVENTS]);
  broadcastState(null, []);
  return { ok: true };
}

/**
 * @param {chrome.tabs.Tab} tab
 * @param {string} type
 */
function tabToEvent(tab, type) {
  const url = tab.url || tab.pendingUrl || "";
  const domain = url ? hostFromUrl(url) : "";
  return {
    timestamp: Date.now(),
    type,
    domain: domain || undefined,
    title: tab.title || undefined,
    url: url || undefined,
  };
}

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
        appendEvents([tabToEvent(tab, "TAB_SWITCH")]);
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
          });
        }
        lastDistractorVisit[domain] = now;
      }

      appendEvents(events);
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
      appendEvents([tabToEvent(t, "TAB_CREATE")]);
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
    appendEvents([
      {
        timestamp: Date.now(),
        type: "NAVIGATION",
        domain: hostFromUrl(url) || undefined,
        title: tab.title || undefined,
        url,
      },
    ]);
  });
});
