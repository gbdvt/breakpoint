/**
 * Calls the Next.js `/api/ai/estimate-task` route (uses ANTHROPIC_API_KEY from the Next app's `.env.local`).
 * Override with `VITE_BREAKPOINT_API_ORIGIN` if the app is not on localhost:3000.
 */

const DEFAULT_NEXT_ORIGIN = "http://localhost:3000";

function apiOrigin(): string {
  const raw = import.meta.env.VITE_BREAKPOINT_API_ORIGIN?.trim() ?? "";
  if (raw) return raw.replace(/\/$/, "");
  return DEFAULT_NEXT_ORIGIN;
}

/** Deterministic fallback when the API is unavailable or fails. */
export function fallbackEstimateMinutes(goal: string): number {
  const words = goal.trim().split(/\s+/).filter(Boolean).length;
  const base = 20 + words * 4;
  return Math.min(180, Math.max(15, Math.round(base)));
}

export type TaskEstimateResult =
  | { ok: true; minutesMin: number; minutesMax: number; oneLiner: string }
  | { ok: false; error: string };

export async function fetchTaskEstimate(params: {
  goal: string;
  taskContextNote: string;
  plannedDurationMin?: number;
  /** Rootly action item / incident lines for the estimator. */
  rootlyContext?: string;
}): Promise<TaskEstimateResult> {
  const origin = apiOrigin();
  const body: Record<string, unknown> = {
    goal: params.goal.trim().slice(0, 500),
    mode: "work",
    taskContextNote: params.taskContextNote.trim().slice(0, 4000),
  };
  const rc = params.rootlyContext?.trim();
  if (rc) body.rootlyContext = rc.slice(0, 2000);
  if (
    params.plannedDurationMin != null &&
    params.plannedDurationMin > 0 &&
    Number.isFinite(params.plannedDurationMin)
  ) {
    body.plannedDurationMin = params.plannedDurationMin;
  }

  const res = await fetch(`${origin}/api/ai/estimate-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    minutesMin?: number;
    minutesMax?: number;
    oneLiner?: string;
    error?: string;
  };

  if (!res.ok) {
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  }

  if (
    typeof data.minutesMin !== "number" ||
    typeof data.minutesMax !== "number" ||
    typeof data.oneLiner !== "string"
  ) {
    return { ok: false, error: "bad_response" };
  }

  return {
    ok: true,
    minutesMin: data.minutesMin,
    minutesMax: data.minutesMax,
    oneLiner: data.oneLiner,
  };
}

export function midpointMinutes(r: {
  minutesMin: number;
  minutesMax: number;
}): number {
  return Math.round((r.minutesMin + r.minutesMax) / 2);
}
