"use client";

import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";
import { computeDriftIndex } from "@/lib/driftEngine";

type Props = {
  session: FocusSession;
  events: BreakpointEvent[];
};

export default function DebriefCard({ session, events }: Props) {
  const firstDrift = events.find(
    (e) => e.type === "DISTRACTOR_OPEN" || e.type === "REPEAT_CHECK",
  );

  const driftLoad = computeDriftIndex(events);

  const sequence = events
    .map((e) => e.domain || e.type)
    .filter(Boolean)
    .join(" → ");

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="mb-2 text-sm text-neutral-500">Session debrief</p>
      <h1 className="mb-4 text-3xl font-semibold text-neutral-900">
        {session.goal}
      </h1>

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
          <p className="text-sm text-neutral-600">First drift signal</p>
          <p className="text-sm font-medium text-neutral-900">
            {firstDrift
              ? firstDrift.domain || firstDrift.type
              : "None detected"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">Sequence</p>
        <p className="text-sm leading-relaxed text-neutral-600">
          {sequence || "No events recorded."}
        </p>
      </div>
    </div>
  );
}
