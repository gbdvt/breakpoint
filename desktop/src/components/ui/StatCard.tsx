type Props = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  accent?: "default" | "positive" | "warning" | "negative";
};

const accentValue: Record<NonNullable<Props["accent"]>, string> = {
  default: "text-white",
  positive: "text-emerald-300/95",
  warning: "text-amber-300/95",
  negative: "text-rose-300/95",
};

export default function StatCard({
  label,
  value,
  hint,
  accent = "default",
}: Props) {
  return (
    <div className="glass-card p-3.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/38">
        {label}
      </p>
      <p
        className={`mt-1 text-[22px] font-semibold tabular-nums tracking-tight ${accentValue[accent]}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-white/45">{hint}</p>
      ) : null}
    </div>
  );
}
