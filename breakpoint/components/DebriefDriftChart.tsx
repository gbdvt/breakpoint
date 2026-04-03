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
import type { DriftSeriesPoint } from "@/lib/debriefTimeline";

type Props = {
  data: DriftSeriesPoint[];
};

export default function DebriefDriftChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-neutral-500">
        Add a few tab events to see drift load over time.
      </p>
    );
  }

  const maxScore = Math.max(8, ...data.map((d) => d.score));

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-neutral-700">
        Drift load over session
      </p>
      <p className="mb-3 text-xs text-neutral-500">
        Step line = rolling rule-based score after each logged event (same engine
        as live nudges). Dashed line is the intervention threshold.
      </p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200" />
            <XAxis
              dataKey="min"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}m`}
              className="text-xs"
              stroke="#94a3b8"
            />
            <YAxis
              domain={[0, maxScore]}
              allowDecimals={false}
              width={28}
              className="text-xs"
              stroke="#94a3b8"
            />
            <Tooltip
              formatter={(value) => [String(value ?? ""), "Drift load"]}
              labelFormatter={(min) => `${String(min)} min from start`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={5}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: "Nudge threshold",
                position: "insideTopRight",
                fill: "#b45309",
                fontSize: 10,
              }}
            />
            <Line
              type="stepAfter"
              dataKey="score"
              stroke="#0f172a"
              strokeWidth={2}
              dot={{ r: 3, fill: "#0f172a" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
