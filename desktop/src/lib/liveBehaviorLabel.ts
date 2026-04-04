import type { ChromeBreakpointEvent } from "@/types/chromeFeed";
import {
  interventionKind,
  isDistractorHost,
  isResearchHintHost,
} from "@/lib/driftEngine";

type SessionPattern =
  | "reactive_heavy"
  | "research_heavy"
  | "mixed"
  | "quiet";

function classifyPattern(events: ChromeBreakpointEvent[]): SessionPattern {
  let reactive = 0;
  let research = 0;
  for (const e of events) {
    if (
      e.type === "DISTRACTOR_OPEN" ||
      e.type === "REPEAT_CHECK" ||
      (e.type === "TAB_SWITCH" && e.domain && isDistractorHost(e.domain))
    ) {
      reactive += 1;
    }
    if (e.type === "TAB_CREATE" && e.domain) {
      if (isResearchHintHost(e.domain) || isDistractorHost(e.domain))
        research += 1;
    }
    if (e.type === "NAVIGATION" && e.domain && isResearchHintHost(e.domain)) {
      research += 0.35;
    }
  }
  if (events.length < 3) return "quiet";
  if (research >= 4 && research >= reactive * 0.65) return "research_heavy";
  if (reactive >= 2 && research >= 2) return "mixed";
  if (reactive >= 2) return "reactive_heavy";
  if (research >= 3) return "research_heavy";
  return "quiet";
}

/** Short label for live session UI (matches web session page hints). */
export function liveBehaviorLabel(events: ChromeBreakpointEvent[]): string {
  if (!events.length) return "";
  const p = classifyPattern(events);
  const ik = interventionKind(events);
  if (ik === "research") return "Research inflation risk (recent tabs)";
  if (p === "reactive_heavy") return "Reactive drift pattern in recent activity";
  if (p === "research_heavy") return "Research stacking in recent activity";
  if (p === "mixed") return "Mixed drift + research signals";
  return "";
}
