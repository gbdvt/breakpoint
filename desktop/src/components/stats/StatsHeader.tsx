"use client";

import { useState } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";

type Range = "week" | "month";

type Props = {
  title?: string;
};

export default function StatsHeader({ title = "Focus analytics" }: Props) {
  const [range, setRange] = useState<Range>("week");
  const [offset, setOffset] = useState(0);

  const label =
    range === "week"
      ? `Week of Apr ${3 + offset * 7} – Apr ${9 + offset * 7}`
      : `April ${2026} · offset ${offset}`;

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/65">
          Long-term view
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-[12px] text-white/45">
          Hours vs distractions — compact, not finance-bro. (Demo data.)
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:items-end">
        <SegmentedControl<Range>
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={range}
          onChange={setRange}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-white/60 hover:text-white"
          >
            ←
          </button>
          <span className="min-w-[140px] text-center font-mono text-[11px] text-white/50">
            {label}
          </span>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] text-white/60 hover:text-white"
          >
            →
          </button>
        </div>
      </div>
    </header>
  );
}
