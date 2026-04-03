"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlassPanel from "@/src/components/ui/GlassPanel";
import SectionHeader from "@/src/components/ui/SectionHeader";

type Row = { day: string; hours: number; distractions: number };

type Props = {
  data: Row[];
};

export default function FocusChartPanel({ data }: Props) {
  return (
    <GlassPanel className="p-4">
      <SectionHeader
        title="Rhythm"
        subtitle="Hours worked vs distraction count"
      />
      <div className="mt-2 h-[200px] min-h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="fillH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="rgb(244, 63, 94)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="h"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <YAxis
              yAxisId="d"
              orientation="right"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(12, 18, 36, 0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 11,
                color: "rgba(255,255,255,0.9)",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            />
            <Area
              yAxisId="h"
              type="monotone"
              dataKey="hours"
              name="Hours"
              stroke="rgb(129, 140, 248)"
              strokeWidth={2}
              fill="url(#fillH)"
            />
            <Area
              yAxisId="d"
              type="monotone"
              dataKey="distractions"
              name="Drifts"
              stroke="rgb(251, 113, 133)"
              strokeWidth={2}
              fill="url(#fillD)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-400/80" /> Hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-400/80" /> Distractions
        </span>
      </div>
    </GlassPanel>
  );
}
