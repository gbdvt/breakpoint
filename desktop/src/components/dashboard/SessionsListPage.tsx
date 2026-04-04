import WorkSessionsPanel from "@/components/dashboard/WorkSessionsPanel";
import { useDesktopData } from "@/context/DesktopDataContext";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { distractionCount, sessionIsLive } from "@/lib/liveSessionDetail";
import { completedToWorkSessionListItem } from "@/lib/sessionStats";
import type { WorkSessionListItem } from "@/types/domain";

export default function SessionsListPage() {
  const { completedSessions } = useDesktopData();
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

  const past = completedSessions.map(completedToWorkSessionListItem);
  const sessions = [...(liveRow ? [liveRow] : []), ...past];

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="px-1 py-4 text-center text-[13px] text-white/40">
          No sessions yet. Start a work session from home, then end it to
          build history.
        </p>
      ) : null}
      <WorkSessionsPanel sessions={sessions} />
    </div>
  );
}
