import WorkSessionsPanel from "@/components/dashboard/WorkSessionsPanel";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { DUMMY_SESSIONS } from "@/lib/dummyData";
import { distractionCount, sessionIsLive } from "@/lib/liveSessionDetail";
import type { WorkSessionListItem } from "@/lib/dummyData";

export default function SessionsListPage() {
  const feed = useChromeBridgeFeed();
  const liveRow: WorkSessionListItem | null =
    feed && sessionIsLive(feed.session) && feed.session
      ? {
          id: "live",
          title: feed.session.goal,
          startedAt: "In progress · Chrome",
          durationMin: Math.max(
            1,
            Math.round((Date.now() - feed.session.startedAt) / 60_000),
          ),
          distractions: distractionCount(feed.events),
          focusScore: Math.max(
            35,
            Math.min(98, 92 - distractionCount(feed.events.slice(-20)) * 4),
          ),
        }
      : null;

  const sessions = [...(liveRow ? [liveRow] : []), ...DUMMY_SESSIONS];

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-white/50">
        Past work blocks — the first row is your{" "}
        <span className="text-white/65">live Chrome session</span> when active.
      </p>
      <WorkSessionsPanel sessions={sessions} />
    </div>
  );
}
