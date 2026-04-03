"use client";

import type { InterventionKind } from "@/lib/driftEngine";

type Props = {
  open: boolean;
  kind: InterventionKind;
  goal: string;
  domain?: string;
  onClose: () => void;
};

const COPY: Record<
  InterventionKind,
  { label: string; title: string; body: string }
> = {
  reactive: {
    label: "Drift detected",
    title: "You moved off your goal",
    body: "This looks like a reactive switch toward a common distractor. Want to return or acknowledge and continue?",
  },
  research: {
    label: "Research inflation",
    title: "Lots of new sources, quickly",
    body: "Opening many tabs in a short window often replaces execution. Enough to start a small step?",
  },
};

export default function InterventionModal({
  open,
  kind,
  goal,
  domain,
  onClose,
}: Props) {
  if (!open) return null;

  const { label, title, body } = COPY[kind];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intervention-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="mb-2 text-sm font-medium text-amber-700">{label}</p>
        <h2
          id="intervention-title"
          className="mb-3 text-xl font-semibold text-neutral-900"
        >
          {title}
        </h2>
        <p className="mb-2 text-sm text-neutral-600">
          <span className="font-medium text-neutral-800">Goal:</span> {goal}
        </p>
        {domain ? (
          <p className="mb-4 text-sm text-neutral-600">
            <span className="font-medium text-neutral-800">Last domain:</span>{" "}
            {domain}
          </p>
        ) : (
          <p className="mb-4 text-sm text-neutral-500">Last domain unknown.</p>
        )}
        <p className="mb-6 text-sm text-neutral-600">{body}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-200"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Park for later
          </button>
        </div>
      </div>
    </div>
  );
}
