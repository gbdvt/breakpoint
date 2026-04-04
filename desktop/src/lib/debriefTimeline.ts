import {
  attentionTone,
  computeDriftIndex,
  type AttentionTone,
} from "@/lib/driftEngine";
import type { ChromeBreakpointEvent } from "@/types/chromeFeed";

export type DriftSeriesPoint = {
  min: number;
  score: number;
  label: string;
};

export type AttentionSegment = {
  startMs: number;
  endMs: number;
  domain?: string;
  tone: AttentionTone;
  widthFrac: number;
};

/** Minimal session window for debrief math (live or completed). */
export type DebriefSessionWindow = {
  startedAt: number;
  endedAt?: number;
};

function sessionEndMs(
  session: DebriefSessionWindow,
  events: ChromeBreakpointEvent[],
): number {
  if (session.endedAt) return session.endedAt;
  if (!events.length) return Math.max(session.startedAt, Date.now());
  const last = [...events].sort((a, b) => a.timestamp - b.timestamp).at(-1);
  return Math.max(last?.timestamp ?? session.startedAt, Date.now());
}

/** Drift load after each event (prefix), x = minutes since session start. */
export function buildDriftSeries(
  session: DebriefSessionWindow,
  events: ChromeBreakpointEvent[],
): DriftSeriesPoint[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const start = session.startedAt;
  const points: DriftSeriesPoint[] = [
    { min: 0, score: 0, label: "Session start" },
  ];
  for (let i = 0; i < sorted.length; i++) {
    const prefix = sorted.slice(0, i + 1);
    const score = computeDriftIndex(prefix);
    const min = (sorted[i].timestamp - start) / 60_000;
    points.push({
      min: Math.round(min * 100) / 100,
      score,
      label: sorted[i].domain || sorted[i].type,
    });
  }
  return points;
}

/** Horizontal strip: inferred context between event timestamps. */
export function buildAttentionSegments(
  session: DebriefSessionWindow,
  events: ChromeBreakpointEvent[],
): AttentionSegment[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const startMs = session.startedAt;
  const endMs = Math.max(sessionEndMs(session, events), startMs + 1);
  const total = endMs - startMs || 1;

  const pts: Array<{ t: number; domain?: string }> = [
    { t: startMs, domain: undefined },
  ];
  let d: string | undefined;
  for (const e of sorted) {
    if (e.domain) d = e.domain;
    pts.push({ t: e.timestamp, domain: d });
  }
  if (pts[pts.length - 1].t < endMs) {
    pts.push({ t: endMs, domain: d });
  }

  const segments: AttentionSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const segStart = pts[i].t;
    const segEnd = pts[i + 1].t;
    if (segEnd <= segStart) continue;
    const domain = pts[i].domain;
    segments.push({
      startMs: segStart,
      endMs: segEnd,
      domain,
      tone: attentionTone(domain),
      widthFrac: (segEnd - segStart) / total,
    });
  }
  return segments;
}

/** Unique domain hops in time order. */
export function domainHopSequence(events: ChromeBreakpointEvent[]): string[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const out: string[] = [];
  let prev: string | undefined;
  for (const e of sorted) {
    const dom = e.domain?.trim();
    if (dom && dom !== prev) {
      out.push(dom);
      prev = dom;
    }
  }
  return out;
}
