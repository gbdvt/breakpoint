"use client";

import { useState } from "react";
import { buildDebriefInsights } from "@/lib/debriefInsights";
import { buildEventDigest } from "@/lib/eventDigest";
import { computeDriftIndex } from "@/lib/driftEngine";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

type Props = {
  session: FocusSession;
  events: BreakpointEvent[];
};

export default function DebriefAiPanel({ session, events }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const insights = buildDebriefInsights(session, events);
      const drift = computeDriftIndex(events);
      const hints = [
        insights.patternTitle,
        `queue~${insights.queue.totalMinutes}m`,
        `driftFinal=${drift}`,
      ].join("; ");

      const res = await fetch("/api/ai/summarize-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: session.goal,
          mode: session.mode,
          digest: buildEventDigest(events),
          hints,
        }),
      });
      const data = (await res.json()) as {
        summary?: string;
        nudge?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setSummary(data.summary ?? null);
      setNudge(data.nudge ?? null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-violet-200/80 bg-violet-50/40 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-900/70">
        AI read (optional)
      </p>
      <p className="mb-3 text-sm text-neutral-600">
        One short pass over your event digest — uses your OpenAI key on the
        server. Run only when you want it.
      </p>
      <button
        type="button"
        disabled={loading || events.length === 0}
        onClick={() => void run()}
        className="rounded-lg bg-violet-900 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
      >
        {loading ? "Summarizing…" : "Summarize this session"}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <div className="mt-4 space-y-2 text-sm text-neutral-800">
          <p className="leading-relaxed">{summary}</p>
          {nudge ? (
            <p className="rounded-lg bg-white/70 p-3 font-medium text-violet-950 ring-1 ring-violet-200/60">
              {nudge}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
