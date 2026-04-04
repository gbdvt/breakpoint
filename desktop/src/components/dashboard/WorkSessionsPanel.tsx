import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkSessionItem from "@/components/dashboard/WorkSessionItem";
import type { WorkSessionListItem } from "@/types/domain";
import { Link } from "react-router-dom";

type Props = {
  sessions: WorkSessionListItem[];
};

export default function WorkSessionsPanel({ sessions }: Props) {
  return (
    <GlassPanel className="p-4">
      <SectionHeader
        title="Recent sessions"
        action={
          <Link
            to="/stats"
            className="text-[11px] font-medium text-indigo-300/80 hover:text-indigo-200"
          >
            Stats →
          </Link>
        }
      />
      <div className="space-y-0.5">
        {sessions.map((s) => (
          <WorkSessionItem key={s.id} session={s} />
        ))}
      </div>
    </GlassPanel>
  );
}
