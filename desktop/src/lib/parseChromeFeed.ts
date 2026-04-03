import type {
  ChromeBreakpointEvent,
  ChromeBridgeSnapshotRaw,
  ChromeEventType,
  ChromeFocusSession,
  ParsedChromeFeed,
  SessionMode,
} from "@/types/chromeFeed";

const EVENT_TYPES = new Set<string>([
  "TAB_SWITCH",
  "TAB_CREATE",
  "NAVIGATION",
  "DISTRACTOR_OPEN",
  "REPEAT_CHECK",
]);

const MODES = new Set<string>(["lecture", "coding", "writing", "research"]);

function parseSession(raw: unknown): ChromeFocusSession | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.goal !== "string") return null;
  if (typeof o.startedAt !== "number" || typeof o.durationMin !== "number")
    return null;
  const mode = typeof o.mode === "string" && MODES.has(o.mode) ? o.mode : "coding";
  const endedAt = typeof o.endedAt === "number" ? o.endedAt : undefined;
  return {
    id: o.id,
    goal: o.goal,
    mode: mode as SessionMode,
    durationMin: o.durationMin,
    startedAt: o.startedAt,
    endedAt,
  };
}

function parseEvent(raw: unknown): ChromeBreakpointEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.timestamp !== "number" || typeof o.type !== "string")
    return null;
  if (!EVENT_TYPES.has(o.type)) return null;
  return {
    timestamp: o.timestamp,
    type: o.type as ChromeEventType,
    domain: typeof o.domain === "string" ? o.domain : undefined,
    title: typeof o.title === "string" ? o.title : undefined,
    url: typeof o.url === "string" ? o.url : undefined,
    tabId: typeof o.tabId === "number" ? o.tabId : undefined,
  };
}

export function parseChromeFeed(raw: ChromeBridgeSnapshotRaw): ParsedChromeFeed {
  const session = parseSession(raw.session);
  const events: ChromeBreakpointEvent[] = [];
  if (Array.isArray(raw.events)) {
    for (const e of raw.events) {
      const p = parseEvent(e);
      if (p) events.push(p);
    }
  }
  return {
    session,
    events,
    updatedAtMs: typeof raw.updatedAtMs === "number" ? raw.updatedAtMs : 0,
  };
}
