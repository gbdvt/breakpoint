import type { BreakpointEvent } from "@/types/event";
import {
  isDistractorHost,
  isResearchHintHost,
  normalizeHost,
} from "@/lib/driftEngine";

const CAP_MINUTES = 180;

/**
 * Rough “hidden workload” from opened sources (honest heuristic, not watch time).
 * YouTube / video hosts weighted higher than docs.
 */
export function estimateResearchQueueMinutes(events: BreakpointEvent[]): {
  totalMinutes: number;
  items: string[];
} {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let total = 0;
  const items: string[] = [];

  for (const e of sorted) {
    const d = e.domain ? normalizeHost(e.domain) : "";
    if (!d) continue;

    if (e.type === "TAB_CREATE") {
      if (d.includes("youtube") || d.endsWith(".youtube.com")) {
        total += 7;
        items.push("+7 min · new YouTube tab (typical clip assumption)");
      } else if (isDistractorHost(e.domain)) {
        total += 5;
        items.push(`+5 min · new tab · ${d}`);
      } else if (isResearchHintHost(e.domain)) {
        total += 4;
        items.push(`+4 min · new research tab · ${d}`);
      }
    }

    if (e.type === "NAVIGATION" && e.url?.includes("youtube.com/watch")) {
      total += 6;
      items.push("+6 min · YouTube watch page navigation");
    } else if (e.type === "NAVIGATION" && isResearchHintHost(e.domain)) {
      total += 3;
      items.push(`+3 min · doc navigation · ${d}`);
    }
  }

  const capped = Math.min(Math.round(total), CAP_MINUTES);
  return { totalMinutes: capped, items: items.slice(-12) };
}
