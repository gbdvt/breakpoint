"use client";

import DomainFavicon from "@/components/DomainFavicon";
import type { DebriefInsights } from "@/lib/debriefInsights";

type Props = {
  insights: DebriefInsights;
};

export default function DebriefInsightsPanel({ insights }: Props) {
  const { firstDrift, timeOnTone, queue, taskStartHint } = insights;

  return (
    <div className="mb-8 rounded-xl border border-amber-200/80 bg-amber-50/40 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-900/70">
        Interpretation
      </p>
      <h2 className="mb-2 text-lg font-semibold text-neutral-900">
        {insights.patternTitle}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-neutral-700">
        {insights.patternBody}
      </p>

      <ul className="space-y-3 text-sm text-neutral-800">
        {firstDrift ? (
          <li className="flex gap-3 rounded-lg bg-white/60 p-3 ring-1 ring-neutral-200/80">
            <div className="mt-0.5 shrink-0">
              {firstDrift.domain ? (
                <DomainFavicon domain={firstDrift.domain} size={22} />
              ) : (
                <span className="inline-block size-[22px] rounded bg-neutral-200" />
              )}
            </div>
            <div>
              <p className="font-medium text-neutral-900">First drift signal</p>
              <p className="text-neutral-600">{firstDrift.kind}</p>
              <p className="mt-1 font-mono text-xs text-neutral-500">
                {firstDrift.label}
              </p>
              {firstDrift.minutesFromStart != null ? (
                <p className="mt-1 text-xs text-neutral-500">
                  ~{firstDrift.minutesFromStart} min after session start
                </p>
              ) : null}
            </div>
          </li>
        ) : (
          <li className="rounded-lg bg-white/60 p-3 text-neutral-600 ring-1 ring-neutral-200/80">
            No clear first drift event (no distractor open, repeat check, or
            distractor focus in the log).
          </li>
        )}

        <li className="rounded-lg bg-white/60 p-3 ring-1 ring-neutral-200/80">
          <p className="font-medium text-neutral-900">Time in context (inferred)</p>
          <p className="mt-1 text-neutral-600">
            Distractor ~{timeOnTone.distractorMin} min · Research ~
            {timeOnTone.researchMin} min · Neutral ~{timeOnTone.neutralMin} min
            {timeOnTone.unknownMin > 0
              ? ` · Unknown ~${timeOnTone.unknownMin} min`
              : ""}
          </p>
        </li>

        <li className="rounded-lg bg-white/60 p-3 ring-1 ring-neutral-200/80">
          <p className="font-medium text-neutral-900">Estimated content queue</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            ~{queue.totalMinutes} min
          </p>
          <p className="mt-1 text-xs text-neutral-500">{queue.disclaimer}</p>
          {queue.sampleLines.length > 0 ? (
            <ul className="mt-2 max-h-28 list-inside list-disc overflow-y-auto text-xs text-neutral-600">
              {queue.sampleLines.slice(-6).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
        </li>

        {taskStartHint ? (
          <li className="rounded-lg bg-white/60 p-3 ring-1 ring-neutral-200/80">
            <p className="font-medium text-neutral-900">Task-start shape</p>
            <p className="mt-1 text-neutral-600">{taskStartHint}</p>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
