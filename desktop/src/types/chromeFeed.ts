/** Mirrors `breakpoint/types/session` + `breakpoint/types/event` (Chrome extension payloads). */

export type SessionMode = "lecture" | "coding" | "writing" | "research";

export type ChromeFocusSession = {
  id: string;
  goal: string;
  mode: SessionMode;
  durationMin: number;
  startedAt: number;
  endedAt?: number;
};

export type ChromeEventType =
  | "TAB_SWITCH"
  | "TAB_CREATE"
  | "NAVIGATION"
  | "DISTRACTOR_OPEN"
  | "REPEAT_CHECK";

export type ChromeBreakpointEvent = {
  timestamp: number;
  type: ChromeEventType;
  domain?: string;
  title?: string;
  url?: string;
  tabId?: number;
  videoDurationSec?: number;
  transcriptBullets?: string[];
  transcriptStatus?: "pending" | "loading" | "ready" | "unavailable" | "error";
  transcriptError?: string;
};

export type ChromeBridgeSnapshotRaw = {
  session: unknown;
  events: unknown[];
  updatedAtMs: number;
};

export type ParsedChromeFeed = {
  session: ChromeFocusSession | null;
  events: ChromeBreakpointEvent[];
  updatedAtMs: number;
};
