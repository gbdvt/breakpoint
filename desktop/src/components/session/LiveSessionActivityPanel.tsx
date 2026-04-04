"use client";

import { Link } from "react-router-dom";
import { computeDriftIndex, shouldIntervene } from "@/lib/driftEngine";
import { distractionCount } from "@/lib/liveSessionDetail";
import { liveBehaviorLabel } from "@/lib/liveBehaviorLabel";
import type { ParsedChromeFeed } from "@/types/chromeFeed";

type Props = {
  feed: ParsedChromeFeed;
};

export default function LiveSessionActivityPanel({ feed }: Props) {
  const events = feed.events;
  const drift = computeDriftIndex(events);
  const hint = liveBehaviorLabel(events);
  const drifts = distractionCount(events);
  const recent = events.slice(-10);

  return (
    <div className="glass-card px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Live activity
          </p>
          <p className="mt-1 text-[11px] text-white/45">
            From Chrome ·{" "}
            {events.length === 0
              ? "switch tabs to build your timeline"
              : `${events.length} event${events.length === 1 ? "" : "s"} logged`}
          </p>
        </div>
        <Link
          to="/session/live"
          className="shrink-0 rounded-lg border border-cyan-200/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-sky-100/90 transition hover:bg-white/[0.1]"
        >
          Full timeline
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-2">
          <p className="text-[9px] uppercase tracking-wide text-white/35">
            Drift load
          </p>
          <p
            className={`mt-0.5 text-lg font-semibold tabular-nums tracking-tight ${
              shouldIntervene(drift) ? "text-amber-200/95" : "text-white/90"
            }`}
          >
            {drift}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-2">
          <p className="text-[9px] uppercase tracking-wide text-white/35">
            Drift hits
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-rose-200/85">
            {drifts}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-2">
          <p className="text-[9px] uppercase tracking-wide text-white/35">
            Rolling
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-white/50">
            last 10 evts
          </p>
        </div>
      </div>

      {hint ? (
        <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 text-[11px] font-medium text-amber-100/90">
          {hint}
        </p>
      ) : null}

      <div className="mt-3 max-h-[200px] space-y-1.5 overflow-y-auto pr-0.5">
        {recent.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-white/40">
            No rows yet. Open sites, change tabs, or navigate — the extension
            streams activity here (titles often fill in after the page loads).
          </p>
        ) : (
          recent.map((e, i) => (
            <div
              key={`${e.timestamp}-${i}`}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
            >
              <div className="text-[11px] font-semibold text-white/80">
                {e.type.replace(/_/g, " ")}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-white/45">
                {e.domain ?? "—"}
                {e.title ? ` · ${e.title}` : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
