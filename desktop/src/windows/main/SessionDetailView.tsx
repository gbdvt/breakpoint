import { Link, useParams } from "react-router-dom";
import SessionDetailPanel from "@/components/session/SessionDetailPanel";
import SessionSummaryCards from "@/components/session/SessionSummaryCards";
import SessionTimeline from "@/components/session/SessionTimeline";
import { DUMMY_SESSION_DETAIL } from "@/lib/dummyData";

export default function SessionDetailView() {
  const { id } = useParams();
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
        to="/"
        className="mb-5 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
      >
        ← Dashboard
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
