import type { ChromeBreakpointEvent } from "@/types/chromeFeed";
import type { TimelineEvent } from "@/types/domain";

function labelForType(t: ChromeBreakpointEvent["type"]): string {
  switch (t) {
    case "NAVIGATION":
      return "Navigation";
    case "TAB_SWITCH":
      return "Tab focus";
    case "TAB_CREATE":
      return "New tab";
    case "DISTRACTOR_OPEN":
      return "Distractor site";
    case "REPEAT_CHECK":
      return "Repeat visit";
    default:
      return "Activity";
  }
}

function toneFor(e: ChromeBreakpointEvent): TimelineEvent["tone"] {
  if (e.type === "DISTRACTOR_OPEN" || e.type === "REPEAT_CHECK") return "drift";
  if (e.type === "NAVIGATION") return "focus";
  return "neutral";
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function mapChromeEventsToTimeline(
  events: ChromeBreakpointEvent[],
): TimelineEvent[] {
  return events.map((e, i) => {
    const domain = e.domain ?? "unknown";
    const title = e.title?.trim();
    const detail = title
      ? `${domain} · ${title.length > 120 ? `${title.slice(0, 120)}…` : title}`
      : e.url
        ? `${domain} · ${e.url.length > 80 ? `${e.url.slice(0, 80)}…` : e.url}`
        : domain;
    return {
      id: `ev-${e.timestamp}-${i}`,
      time: formatTime(e.timestamp),
      label: labelForType(e.type),
      detail,
      tone: toneFor(e),
    };
  });
}
