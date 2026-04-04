import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";

type Best = { label: string; value: string; when: string };

type Props = {
  items: Best[];
};

export default function PersonalBestsCard({ items }: Props) {
  return (
    <GlassPanel className="p-4">
      <SectionHeader title="Personal bests" subtitle="Celebrate small wins" />
      <ul className="mt-1 space-y-3">
        {items.length === 0 ? (
          <li className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-4 text-center text-[12px] text-white/40">
            Complete a few sessions to see personal bests here.
          </li>
        ) : null}
        {items.map((b, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
          >
            <div>
              <p className="text-[11px] text-white/45">{b.label}</p>
              <p className="text-[15px] font-semibold tabular-nums tracking-tight text-amber-200/90">
                {b.value}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-white/35">{b.when}</span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
