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
  /** YouTube (and similar): HTML video duration in seconds when the extension probes the tab. */
  videoDurationSec?: number;
  /** Auto summary from caption transcript (Next `/api/ai/summarize-youtube-transcript`). */
  transcriptBullets?: string[];
  transcriptStatus?: "pending" | "loading" | "ready" | "unavailable" | "error";
  transcriptError?: string;
};
