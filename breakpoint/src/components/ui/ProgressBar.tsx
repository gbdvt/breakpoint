type Props = {
  value: number;
  max?: number;
  className?: string;
  /** Tailwind color for fill */
  fillClassName?: string;
};

export default function ProgressBar({
  value,
  max = 100,
  className = "",
  fillClassName = "bg-gradient-to-r from-emerald-400/90 to-cyan-400/80",
}: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${fillClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
