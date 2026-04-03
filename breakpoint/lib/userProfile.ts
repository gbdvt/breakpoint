import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";
import { buildDriftSeries } from "@/lib/debriefTimeline";

const PROFILE_KEY = "breakpoint_user_profile";

export type UserProfile = {
  version: 1;
  sessionCount: number;
  /** Exponential moving average of completed session length (minutes). */
  avgSessionLengthMin: number | null;
  /** EMA of peak drift load seen in a session (0–~10 scale). */
  avgPeakDrift: number | null;
  /** EMA of planned duration the user typed at start. */
  avgPlannedDurationMin: number | null;
};

const DEFAULT_PROFILE: UserProfile = {
  version: 1,
  sessionCount: 0,
  avgSessionLengthMin: null,
  avgPeakDrift: null,
  avgPlannedDurationMin: null,
};

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return { ...DEFAULT_PROFILE };
  try {
    const p = JSON.parse(raw) as UserProfile;
    if (p?.version !== 1) return { ...DEFAULT_PROFILE };
    return {
      ...DEFAULT_PROFILE,
      ...p,
      version: 1,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveUserProfile(p: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

const EMA = 0.28;

function nextEma(prev: number | null, value: number): number {
  if (prev == null) return value;
  return Math.round((EMA * value + (1 - EMA) * prev) * 10) / 10;
}

/** Call when user completes a session (e.g. before clearing storage). */
export function recordSessionComplete(
  session: FocusSession,
  events: BreakpointEvent[],
) {
  const end = session.endedAt ?? Date.now();
  const durationMin = Math.max(0, (end - session.startedAt) / 60_000);
  const series = buildDriftSeries(session, events);
  const peakDrift = series.reduce((m, pt) => Math.max(m, pt.score), 0);

  const prev = getUserProfile();
  const next: UserProfile = {
    version: 1,
    sessionCount: prev.sessionCount + 1,
    avgSessionLengthMin: nextEma(prev.avgSessionLengthMin, durationMin),
    avgPeakDrift: nextEma(prev.avgPeakDrift, peakDrift),
    avgPlannedDurationMin: nextEma(
      prev.avgPlannedDurationMin,
      session.durationMin,
    ),
  };
  saveUserProfile(next);
}

/** Compact blob for API prompts (few tokens). */
export function profileForPrompt(p: UserProfile): {
  n: number;
  avgMin: number | null;
  avgDrift: number | null;
  avgPlanned: number | null;
} {
  return {
    n: p.sessionCount,
    avgMin: p.avgSessionLengthMin,
    avgDrift: p.avgPeakDrift,
    avgPlanned: p.avgPlannedDurationMin,
  };
}
