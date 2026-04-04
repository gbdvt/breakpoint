import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import TimelineEventItem from "@/components/session/TimelineEventItem";
import type { TimelineEvent } from "@/types/domain";

type Props = {
  events: TimelineEvent[];
};

export default function SessionTimeline({ events }: Props) {
  return (
    <GlassPanel className="p-5">
      <SectionHeader title="Timeline" />
      <div className="mt-2">
        {events.length === 0 ? (
          <p className="py-2 text-[12px] leading-relaxed text-white/40">
            No events yet. Switch tabs, open new ones, or navigate in Chrome —
            the extension records activity here. Page titles often appear after
            the tab finishes loading.
          </p>
        ) : (
          events.map((e, i) => (
            <TimelineEventItem
              key={e.id}
              event={e}
              isLast={i === events.length - 1}
            />
          ))
        )}
      </div>
    </GlassPanel>
  );
}
