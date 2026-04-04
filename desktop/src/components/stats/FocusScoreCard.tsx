import GlassPanel from "@/components/ui/GlassPanel";
import ProgressBar from "@/components/ui/ProgressBar";

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
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-white">
          {score === 0 ? "—" : score}
        </span>
        <span className="pb-2 text-[12px] text-white/40">from your sessions</span>
      </div>
      <ProgressBar
        value={score === 0 ? 0 : score}
        className="mt-4"
        fillClassName="bg-gradient-to-r from-emerald-400/85 via-teal-400/75 to-cyan-400/70"
      />
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        Heuristic from drift counts across completed sessions on this device.
      </p>
    </GlassPanel>
  );
}
