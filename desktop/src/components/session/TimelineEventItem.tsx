import type { TimelineEvent } from "@/types/domain";

type Props = {
  event: TimelineEvent;
  isLast: boolean;
};

const toneRing: Record<TimelineEvent["tone"], string> = {
  focus: "border-emerald-400/50 bg-emerald-500/15",
  drift: "border-rose-400/45 bg-rose-500/12",
  milestone: "border-amber-400/45 bg-amber-500/12",
  neutral: "border-white/15 bg-white/[0.06]",
};

const toneLabel: Record<TimelineEvent["tone"], string> = {
  focus: "text-emerald-300/85",
  drift: "text-rose-300/85",
  milestone: "text-amber-200/85",
  neutral: "text-white/55",
};

export default function TimelineEventItem({ event, isLast }: Props) {
  return (
    <div className="relative flex gap-4 pl-1">
      {!isLast ? (
        <div
          className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-gradient-to-b from-white/15 to-transparent"
          aria-hidden
        />
      ) : null}
      <div
        className={`relative z-[1] mt-0.5 size-3 shrink-0 rounded-full border ${toneRing[event.tone]}`}
      />
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-medium tabular-nums text-white/40">
            {event.time}
          </span>
          <span className={`text-[12px] font-semibold ${toneLabel[event.tone]}`}>
            {event.label}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          {event.detail}
        </p>
      </div>
    </div>
  );
}
