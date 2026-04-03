import StatCard from "@/src/components/ui/StatCard";

type Props = {
  hoursWorked: number;
  distractions: number;
  tasksDone: number;
  sessions: number;
  timeDistractedMin: number;
  avgDistractedPerSession: number;
};

export default function MetricsGrid({
  hoursWorked,
  distractions,
  tasksDone,
  sessions,
  timeDistractedMin,
  avgDistractedPerSession,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Hours worked"
        value={`${hoursWorked}h`}
        hint="Deep blocks logged"
        accent="positive"
      />
      <StatCard
        label="Distractions"
        value={distractions}
        hint="Drift signals (week)"
        accent="negative"
      />
      <StatCard label="Tasks done" value={tasksDone} hint="Completed" />
      <StatCard label="Sessions" value={sessions} hint="Started & ended" />
      <StatCard
        label="Time distracted"
        value={`${timeDistractedMin}m`}
        hint="Estimated"
        accent="warning"
      />
      <StatCard
        label="Avg / session"
        value={avgDistractedPerSession}
        hint="Drifts per session"
      />
    </div>
  );
}
