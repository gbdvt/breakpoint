import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import TaskItem from "@/components/dashboard/TaskItem";
import type { Task } from "@/types/domain";

type Props = {
  tasks: Task[];
};

export default function TasksPanel({ tasks }: Props) {
  const open = tasks.filter((t) => !t.done).length;
  return (
    <GlassPanel className="p-4">
      <SectionHeader
        title="Tasks"
        subtitle={`${open} open · estimates from AI / you`}
      />
      <div className="divide-y divide-white/[0.05]">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} />
        ))}
      </div>
    </GlassPanel>
  );
}
