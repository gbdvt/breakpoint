import GlassPanel from "@/src/components/ui/GlassPanel";
import SectionHeader from "@/src/components/ui/SectionHeader";
import WorkSessionItem from "@/src/components/dashboard/WorkSessionItem";
import type { WorkSessionListItem } from "@/src/lib/dummyData";
import Link from "next/link";

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
            href="/stats"
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
