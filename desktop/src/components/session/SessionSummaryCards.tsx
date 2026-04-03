import GlassPanel from "@/components/ui/GlassPanel";
import StatCard from "@/components/ui/StatCard";

type Props = {
  durationMin: number;
  tasksCompleted: number;
  distractions: number;
  queueCostMin: number;
};

export default function SessionSummaryCards({
  durationMin,
  tasksCompleted,
  distractions,
  queueCostMin,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Duration"
        value={`${durationMin}m`}
        hint="Tracked block"
      />
      <StatCard
        label="Tasks done"
        value={tasksCompleted}
        hint="Checked in this session"
        accent="positive"
      />
      <StatCard
        label="Distractions"
        value={distractions}
        hint="Drift signals caught"
        accent="negative"
      />
      <StatCard
        label="Queue cost (est.)"
        value={`+${queueCostMin}m`}
        hint="Hidden workload heuristic"
        accent="warning"
      />
    </div>
  );
}
