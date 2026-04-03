import { Link, useParams } from "react-router-dom";
import SessionDetailPanel from "@/components/session/SessionDetailPanel";
import SessionSummaryCards from "@/components/session/SessionSummaryCards";
import SessionTimeline from "@/components/session/SessionTimeline";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { DUMMY_SESSION_DETAIL } from "@/lib/dummyData";
import { buildLiveSessionDetail, sessionIsLive } from "@/lib/liveSessionDetail";

export default function SessionDetailView() {
  const { id } = useParams();
  const feed = useChromeBridgeFeed();

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
          <p className="text-[13px] leading-relaxed text-white/55">
            No active Chrome session. Start one from your web dashboard (
            <span className="font-mono text-white/70">localhost:3000</span>)
            with the extension enabled, then open this view again.
          </p>
        </>
      );
    }
    const detail = buildLiveSessionDetail(feed);
    if (!detail) {
      return null;
    }
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

  const detail =
    id === DUMMY_SESSION_DETAIL.id
      ? DUMMY_SESSION_DETAIL
      : {
          ...DUMMY_SESSION_DETAIL,
          id: id ?? "unknown",
          name: `Session · ${id ?? "?"}`,
          dateLabel: "Demo layout · placeholder",
        };

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
