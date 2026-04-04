"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionHeader from "@/components/ui/SectionHeader";
import type { DriftSeriesPoint } from "@/lib/debriefTimeline";

type Props = {
  data: DriftSeriesPoint[];
};

export default function SessionDriftChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="glass-card p-5">
        <SectionHeader title="Drift load" subtitle="Over the session" />
      </div>
    );
  }

  const maxScore = Math.max(8, ...data.map((d) => d.score));

  return (
    <div className="glass-card p-5">
      <SectionHeader title="Drift load" subtitle="Over the session" />
      <div className="mt-4 h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="min"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}m`}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              stroke="rgba(255,255,255,0.12)"
            />
            <YAxis
              domain={[0, maxScore]}
              allowDecimals={false}
              width={26}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              stroke="rgba(255,255,255,0.12)"
            />
            <Tooltip
              formatter={(value) => [String(value ?? ""), "Drift load"]}
              labelFormatter={(min) => `${String(min)} min from start`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(15,23,42,0.95)",
                color: "#f8fafc",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={5}
              stroke="rgba(251, 191, 36, 0.65)"
              strokeDasharray="4 4"
            />
            <Line
              type="stepAfter"
              dataKey="score"
              stroke="rgb(165, 180, 252)"
              strokeWidth={2}
              dot={{ r: 3, fill: "rgb(165, 180, 252)" }}
              activeDot={{ r: 5, fill: "rgb(199, 210, 254)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
