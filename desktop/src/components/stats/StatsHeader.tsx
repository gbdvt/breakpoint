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
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
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
