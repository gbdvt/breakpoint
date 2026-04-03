"use client";

import type { AttentionSegment } from "@/lib/debriefTimeline";

const TONE_BG: Record<AttentionSegment["tone"], string> = {
  distractor: "bg-rose-400/90",
  research: "bg-amber-400/90",
  neutral: "bg-emerald-400/85",
  unknown: "bg-neutral-300",
};

const TONE_LABEL: Record<AttentionSegment["tone"], string> = {
  distractor: "Distractor",
  research: "Research / docs",
  neutral: "On-task / other",
  unknown: "Unknown",
};

type Props = {
  segments: AttentionSegment[];
};

export default function DebriefAttentionStrip({ segments }: Props) {
  if (!segments.length) {
    return (
      <p className="text-sm text-neutral-500">
        Not enough timing data to draw the attention strip.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">
        Attention over time
      </p>
      <div
        className="flex h-9 w-full overflow-hidden rounded-lg ring-1 ring-neutral-200"
        title="Each color is where your active tab context sat between logged events."
      >
        {segments.map((s, i) => (
          <div
            key={`${s.startMs}-${i}`}
            className={`${TONE_BG[s.tone]} min-w-px transition-[flex-grow]`}
            style={{
              flexGrow: Math.max(s.widthFrac * 10_000, 0.5),
              flexBasis: 0,
            }}
            title={`${TONE_LABEL[s.tone]}${s.domain ? ` · ${s.domain}` : ""} · ${((s.endMs - s.startMs) / 1000).toFixed(0)}s`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        {(Object.keys(TONE_LABEL) as AttentionSegment["tone"][]).map((tone) => (
          <li key={tone} className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-sm ${TONE_BG[tone]}`}
              aria-hidden
            />
            {TONE_LABEL[tone]}
          </li>
        ))}
      </ul>
    </div>
  );
}
