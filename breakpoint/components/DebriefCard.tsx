"use client";

import DebriefAttentionStrip from "@/components/DebriefAttentionStrip";
import DebriefDriftChart from "@/components/DebriefDriftChart";
import DomainFavicon from "@/components/DomainFavicon";
import {
  buildAttentionSegments,
  buildDriftSeries,
  domainHopSequence,
} from "@/lib/debriefTimeline";
import { buildDebriefInsights } from "@/lib/debriefInsights";
import { computeDriftIndex } from "@/lib/driftEngine";
import DebriefAiPanel from "@/components/DebriefAiPanel";
import DebriefInsightsPanel from "@/components/DebriefInsightsPanel";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

type Props = {
  session: FocusSession;
  events: BreakpointEvent[];
};

export default function DebriefCard({ session, events }: Props) {
  const insights = buildDebriefInsights(session, events);
  const firstDrift = insights.firstDrift;

  const driftLoad = computeDriftIndex(events);
  const driftSeries = buildDriftSeries(session, events);
  const attentionSegments = buildAttentionSegments(session, events);
  const hops = domainHopSequence(events);

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="mb-2 text-sm text-neutral-500">Session debrief</p>
      <h1 className="mb-2 text-3xl font-semibold text-neutral-900">
        {session.goal}
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-neutral-600">
        {insights.tagline}
      </p>

      <DebriefInsightsPanel insights={insights} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-600">Events logged</p>
          <p className="text-2xl font-bold text-neutral-900">{events.length}</p>
        </div>
        <div className="rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-600">Drift load (snapshot)</p>
          <p className="text-2xl font-bold text-neutral-900">{driftLoad}</p>
        </div>
        <div className="rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-600">Quick first signal</p>
          <div className="mt-1 flex items-center gap-2">
            {firstDrift?.domain ? (
              <DomainFavicon domain={firstDrift.domain} size={24} />
            ) : null}
            <p className="text-sm font-medium text-neutral-900">
              {firstDrift
                ? firstDrift.domain || firstDrift.label
                : "None detected"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50/50 p-5">
        <DebriefAttentionStrip segments={attentionSegments} />
      </div>

      <div className="mb-8 rounded-xl border border-neutral-200 p-5">
        <DebriefDriftChart data={driftSeries} />
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="mb-3 text-sm font-medium text-neutral-700">
          Domain trail
        </p>
        {hops.length === 0 ? (
          <p className="text-sm text-neutral-500">No domains recorded.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {hops.map((d, i) => (
              <span key={`${d}-${i}`} className="flex items-center gap-2">
                {i > 0 ? (
                  <span className="text-neutral-400" aria-hidden>
                    →
                  </span>
                ) : null}
                <span className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5">
                  <DomainFavicon domain={d} size={20} />
                  <span className="max-w-[140px] truncate text-sm text-neutral-800">
                    {d}
                  </span>
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <DebriefAiPanel session={session} events={events} />
    </div>
  );
}
