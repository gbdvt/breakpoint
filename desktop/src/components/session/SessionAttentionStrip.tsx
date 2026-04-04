"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import type { AttentionSegment } from "@/lib/debriefTimeline";

const TONE_BG: Record<AttentionSegment["tone"], string> = {
  distractor: "bg-rose-400/85",
  research: "bg-amber-400/80",
  neutral: "bg-emerald-400/75",
  unknown: "bg-white/25",
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

export default function SessionAttentionStrip({ segments }: Props) {
  if (!segments.length) {
    return (
      <div className="glass-card p-4">
        <SectionHeader title="Attention" subtitle="Over time" />
        <p className="mt-2 text-[12px] text-white/40">
          Not enough timed events to draw this strip yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <SectionHeader title="Attention" subtitle="Where context sat between events" />
      <div
        className="mt-3 flex h-9 w-full overflow-hidden rounded-xl ring-1 ring-white/[0.1]"
        title="Width ∝ duration in each context."
      >
        {segments.map((s, i) => (
          <div
            key={`${s.startMs}-${i}`}
            className={`${TONE_BG[s.tone]} min-w-px`}
            style={{
              flexGrow: Math.max(s.widthFrac * 10_000, 0.5),
              flexBasis: 0,
            }}
            title={`${TONE_LABEL[s.tone]}${s.domain ? ` · ${s.domain}` : ""} · ${((s.endMs - s.startMs) / 1000).toFixed(0)}s`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/50">
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

