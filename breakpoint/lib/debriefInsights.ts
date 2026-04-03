import type { AttentionSegment } from "@/lib/debriefTimeline";
import { buildAttentionSegments } from "@/lib/debriefTimeline";
import { estimateResearchQueueMinutes } from "@/lib/researchQueueEstimate";
import {
  attentionTone,
  computeDriftIndex,
  interventionKind,
  isDistractorHost,
  isResearchHintHost,
} from "@/lib/driftEngine";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

export type SessionPattern =
  | "reactive_heavy"
  | "research_heavy"
  | "mixed"
  | "quiet";

export type DebriefInsights = {
  tagline: string;
  pattern: SessionPattern;
  patternTitle: string;
  patternBody: string;
  firstDrift: {
    label: string;
    minutesFromStart: number | null;
    domain?: string;
    title?: string;
    kind: string;
  } | null;
  timeOnTone: {
    distractorMin: number;
    researchMin: number;
    neutralMin: number;
    unknownMin: number;
  };
  queue: {
    totalMinutes: number;
    sampleLines: string[];
    disclaimer: string;
  };
  taskStartHint: string | null;
};

function sumToneMinutes(segments: AttentionSegment[]) {
  let distractor = 0;
  let research = 0;
  let neutral = 0;
  let unknown = 0;
  for (const s of segments) {
    const sec = (s.endMs - s.startMs) / 1000;
    const min = sec / 60;
    if (s.tone === "distractor") distractor += min;
    else if (s.tone === "research") research += min;
    else if (s.tone === "neutral") neutral += min;
    else unknown += min;
  }
  return {
    distractorMin: Math.round(distractor * 10) / 10,
    researchMin: Math.round(research * 10) / 10,
    neutralMin: Math.round(neutral * 10) / 10,
    unknownMin: Math.round(unknown * 10) / 10,
  };
}

function findFirstDrift(
  session: FocusSession,
  sorted: BreakpointEvent[],
): DebriefInsights["firstDrift"] {
  for (const e of sorted) {
    if (e.type === "DISTRACTOR_OPEN" || e.type === "REPEAT_CHECK") {
      const mins = (e.timestamp - session.startedAt) / 60_000;
      return {
        label: e.title?.slice(0, 80) || e.domain || e.type,
        minutesFromStart: Math.round(mins * 10) / 10,
        domain: e.domain,
        title: e.title,
        kind:
          e.type === "REPEAT_CHECK"
            ? "Repeat check (same escape)"
            : "Left work for a distractor",
      };
    }
    if (e.type === "TAB_SWITCH" && e.domain && isDistractorHost(e.domain)) {
      const mins = (e.timestamp - session.startedAt) / 60_000;
      return {
        label: e.title?.slice(0, 80) || e.domain,
        minutesFromStart: Math.round(mins * 10) / 10,
        domain: e.domain,
        title: e.title,
        kind: "Focused a distractor tab",
      };
    }
  }
  return null;
}

function classifyPattern(events: BreakpointEvent[]): SessionPattern {
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

function patternCopy(p: SessionPattern): { title: string; body: string } {
  switch (p) {
    case "reactive_heavy":
      return {
        title: "Reactive drift",
        body: "Repeated switches toward feeds and escape tabs — the classic overload reflex.",
      };
    case "research_heavy":
      return {
        title: "Research inflation",
        body: "Lots of new docs, repos, or media tabs — prep that can replace execution.",
      };
    case "mixed":
      return {
        title: "Mixed avoidance",
        body: "Both compulsive checking and research stacking showed up in this session.",
      };
    default:
      return {
        title: "Light drift signal",
        body: "Fewer strong avoidance signatures in this window — or the session was short.",
      };
  }
}

/** Minutes until first neutral-domain navigation/switch (rough “started working”). */
function taskStartLatencyMinutes(
  session: FocusSession,
  sorted: BreakpointEvent[],
): number | null {
  for (const e of sorted) {
    if (e.type !== "TAB_SWITCH" && e.type !== "NAVIGATION") continue;
    if (!e.domain) continue;
    const tone = attentionTone(e.domain);
    if (tone === "neutral") {
      return Math.round(((e.timestamp - session.startedAt) / 60_000) * 10) / 10;
    }
  }
  return null;
}

export function buildDebriefInsights(
  session: FocusSession,
  events: BreakpointEvent[],
): DebriefInsights {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const segments = buildAttentionSegments(session, events);
  const timeOnTone = sumToneMinutes(segments);
  const pattern = classifyPattern(events);
  const firstDrift = findFirstDrift(session, sorted);
  const queue = estimateResearchQueueMinutes(events);
  const ik = interventionKind(events);
  const score = computeDriftIndex(events);

  let patternFinal = pattern;
  if (ik === "research" && patternFinal === "quiet" && score >= 5) {
    patternFinal = "research_heavy";
  }
  const pc = patternCopy(patternFinal);

  const latency = taskStartLatencyMinutes(session, sorted);
  let taskStartHint: string | null = null;
  if (latency != null && latency > 3) {
    taskStartHint = `First neutral “work-shaped” tab context showed up after ~${latency} min — possible task-start friction if you intended to begin earlier.`;
  } else if (latency != null && sorted.length > 2) {
    taskStartHint = `You had on-task context within ~${latency} min of starting.`;
  }

  return {
    tagline:
      "Breakpoint catches when overload turns into avoidance — here’s how this session looked.",
    pattern: patternFinal,
    patternTitle: pc.title,
    patternBody: pc.body,
    firstDrift,
    timeOnTone,
    queue: {
      totalMinutes: queue.totalMinutes,
      sampleLines: queue.items,
      disclaimer:
        "Queue minutes are a rough heuristic (not watch history or reading time).",
    },
    taskStartHint,
  };
}

/** Short label for live session UI */
export function liveBehaviorLabel(events: BreakpointEvent[]): string {
  if (!events.length) return "";
  const p = classifyPattern(events);
  const ik = interventionKind(events);
  if (ik === "research") return "Research inflation risk (recent tabs)";
  if (p === "reactive_heavy") return "Reactive drift pattern in recent activity";
  if (p === "research_heavy") return "Research stacking in recent activity";
  if (p === "mixed") return "Mixed drift + research signals";
  return "";
}
