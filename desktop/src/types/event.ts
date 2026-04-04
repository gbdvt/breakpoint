export type BreakpointEventType =
  | "TAB_SWITCH"
  | "TAB_CREATE"
  | "NAVIGATION"
  | "DISTRACTOR_OPEN"
  | "REPEAT_CHECK";

export type BreakpointEvent = {
  timestamp: number;
  type: BreakpointEventType;
  domain?: string;
  /** Page title when captured; may refresh when the tab finishes loading (YouTube, ChatGPT, etc.). */
  title?: string;
  url?: string;
  /** Chrome tab id — used to attach late title updates from the extension. */
  tabId?: number;
  /** YouTube: probed <video> duration in seconds. */
  videoDurationSec?: number;
  transcriptBullets?: string[];
  transcriptStatus?: "pending" | "loading" | "ready" | "unavailable" | "error";
  transcriptError?: string;
};
