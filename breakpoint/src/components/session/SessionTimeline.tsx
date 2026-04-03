import GlassPanel from "@/src/components/ui/GlassPanel";
import SectionHeader from "@/src/components/ui/SectionHeader";
import TimelineEventItem from "@/src/components/session/TimelineEventItem";
import type { TimelineEvent } from "@/src/lib/dummyData";

type Props = {
  events: TimelineEvent[];
};

export default function SessionTimeline({ events }: Props) {
  return (
    <GlassPanel className="p-5">
      <SectionHeader
        title="Session timeline"
        subtitle="Distractions, recovery, milestones"
      />
      <div className="mt-2">
        {events.map((e, i) => (
          <TimelineEventItem
            key={e.id}
            event={e}
            isLast={i === events.length - 1}
          />
        ))}
      </div>
    </GlassPanel>
  );
}
