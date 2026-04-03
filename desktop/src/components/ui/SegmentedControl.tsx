"use client";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div
      className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.04] p-0.5 backdrop-blur-md"
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-[10px] px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
              active
                ? "bg-white/[0.12] text-white shadow-sm"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
