import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";
import { attentionTone, computeDriftIndex, type AttentionTone } from "@/lib/driftEngine";

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

function sessionEndMs(session: FocusSession, events: BreakpointEvent[]): number {
  if (session.endedAt) return session.endedAt;
  if (!events.length) return session.startedAt;
  const last = [...events].sort((a, b) => a.timestamp - b.timestamp).at(-1);
  return last?.timestamp ?? session.startedAt;
}

/** Drift load after each event (prefix), x = minutes since session start. */
export function buildDriftSeries(
  session: FocusSession,
  events: BreakpointEvent[],
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

/** Horizontal strip: inferred “where you were” between event timestamps. */
export function buildAttentionSegments(
  session: FocusSession,
  events: BreakpointEvent[],
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
    const start = pts[i].t;
    const end = pts[i + 1].t;
    if (end <= start) continue;
    const domain = pts[i].domain;
    segments.push({
      startMs: start,
      endMs: end,
      domain,
      tone: attentionTone(domain),
      widthFrac: (end - start) / total,
    });
  }
  return segments;
}

/** Unique domain hops in time order (for favicon trail). */
export function domainHopSequence(events: BreakpointEvent[]): string[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const out: string[] = [];
  let prev: string | undefined;
  for (const e of sorted) {
    const d = e.domain?.trim();
    if (d && d !== prev) {
      out.push(d);
      prev = d;
    }
  }
  return out;
}
