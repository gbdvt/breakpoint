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
  title?: string;
  url?: string;
};
