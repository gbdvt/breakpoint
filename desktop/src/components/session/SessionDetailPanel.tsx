import GlassPanel from "@/components/ui/GlassPanel";
import ProgressBar from "@/components/ui/ProgressBar";
import type { SessionDetail } from "@/types/domain";

type Props = {
  detail: SessionDetail;
};

export default function SessionDetailPanel({ detail }: Props) {
  const focusPct = Math.min(
    100,
    Math.round(100 - detail.distractions * 8 - detail.queueCostMin * 0.3),
  );

  const hasMilestones = detail.milestones.length > 0;

  return (
    <div className="space-y-5">
      <GlassPanel variant="elevated" className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
          {detail.name}
        </h1>
        <p className="mt-2 text-[13px] text-white/45">{detail.dateLabel}</p>

        <div
          className={`mt-6 grid gap-4 ${hasMilestones ? "sm:grid-cols-2" : ""}`}
        >
          <div>
            <p className="text-[10px] text-white/35">Focus</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-white">
                {focusPct}
              </span>
              <span className="pb-1 text-[12px] text-white/40">/ 100</span>
            </div>
            <ProgressBar
              value={focusPct}
              className="mt-3"
              fillClassName="bg-gradient-to-r from-indigo-400/90 to-cyan-400/70"
            />
          </div>
          {hasMilestones ? (
            <div>
              <p className="text-[10px] text-white/35">Milestones</p>
              <ul className="mt-2 space-y-2">
                {detail.milestones.map((m, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12px] leading-snug text-white/65"
                  >
                    <span className="text-emerald-400/70">✓</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
}
