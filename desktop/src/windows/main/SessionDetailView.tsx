import { Link, useParams } from "react-router-dom";
import SessionDetailPanel from "@/components/session/SessionDetailPanel";
import SessionSummaryCards from "@/components/session/SessionSummaryCards";
import SessionTimeline from "@/components/session/SessionTimeline";
import { useDesktopData } from "@/context/DesktopDataContext";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { computeDriftIndex, shouldIntervene } from "@/lib/driftEngine";
import { liveBehaviorLabel } from "@/lib/liveBehaviorLabel";
import { buildLiveSessionDetail, sessionIsLive } from "@/lib/liveSessionDetail";
import { completedToSessionDetail } from "@/lib/sessionStats";

export default function SessionDetailView() {
  const { id } = useParams();
  const feed = useChromeBridgeFeed();
  const { completedSessions } = useDesktopData();

  if (id === "live") {
    if (!feed) {
      return (
        <p className="text-[12px] text-white/45">Loading session…</p>
      );
    }
    if (!sessionIsLive(feed.session)) {
      return (
        <>
          <Link
            to="/sessions"
            className="mb-5 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
          >
            ← Sessions
          </Link>
          <p className="text-[13px] text-white/45">No active session.</p>
        </>
      );
    }
    const detail = buildLiveSessionDetail(feed);
    if (!detail) {
      return null;
    }
    const driftLive = computeDriftIndex(feed.events);
    const hintLive = liveBehaviorLabel(feed.events);
    return (
      <>
        <Link
          to="/sessions"
          className="mb-5 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
        >
          ← Sessions
        </Link>
        <div className="mb-4">
          <div className="glass-card px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Drift load (rolling)
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
                shouldIntervene(driftLive)
                  ? "text-amber-200/95"
                  : "text-white/90"
              }`}
            >
              {driftLive}
            </p>
            <p className="mt-1 text-[10px] text-white/35">
              Rule-based score from recent events; not a medical measure.
            </p>
            {hintLive ? (
              <p className="mt-2 text-[12px] font-medium text-amber-100/85">
                {hintLive}
              </p>
            ) : null}
          </div>
        </div>
        <SessionDetailPanel detail={detail} />
        <div className="mt-5 space-y-5">
          <SessionSummaryCards
            durationMin={detail.durationMin}
            tasksCompleted={detail.tasksCompleted}
            distractions={detail.distractions}
            queueCostMin={detail.queueCostMin}
          />
          <SessionTimeline events={detail.timeline} />
        </div>
      </>
    );
  }

  const saved = id
    ? completedSessions.find((s) => s.id === id)
    : undefined;

  if (!saved) {
    return (
      <>
        <Link
          to="/sessions"
          className="mb-5 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
        >
          ← Sessions
        </Link>
        <p className="text-[13px] text-white/45">
          Session not found. It may have been recorded on another device or
          cleared from this machine.
        </p>
      </>
    );
  }

  const detail = completedToSessionDetail(saved);

  return (
    <>
      <Link
        to="/sessions"
        className="mb-5 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
      >
        ← Sessions
      </Link>
      <SessionDetailPanel detail={detail} />
      <div className="mt-5 space-y-5">
        <SessionSummaryCards
          durationMin={detail.durationMin}
          tasksCompleted={detail.tasksCompleted}
          distractions={detail.distractions}
          queueCostMin={detail.queueCostMin}
        />
        <SessionTimeline events={detail.timeline} />
      </div>
    </>
  );
}
