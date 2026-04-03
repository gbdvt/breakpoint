import GlassPanel from "@/src/components/ui/GlassPanel";
import ProgressBar from "@/src/components/ui/ProgressBar";

type Props = {
  score: number;
};

export default function FocusScoreCard({ score }: Props) {
  return (
    <GlassPanel variant="elevated" className="p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Composite focus score
      </p>
      <div className="mt-3 flex items-end gap-3">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-white">
          {score}
        </span>
        <span className="pb-2 text-[12px] text-white/40">rolling · demo</span>
      </div>
      <ProgressBar
        value={score}
        className="mt-4"
        fillClassName="bg-gradient-to-r from-emerald-400/85 via-teal-400/75 to-cyan-400/70"
      />
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        Blends session length, recovery speed, and drift density — placeholder
        until wired to your engine.
      </p>
    </GlassPanel>
  );
}
