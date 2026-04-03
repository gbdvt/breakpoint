import Link from "next/link";
import AppShell from "@/src/components/ui/AppShell";
import SessionDetailPanel from "@/src/components/session/SessionDetailPanel";
import SessionSummaryCards from "@/src/components/session/SessionSummaryCards";
import SessionTimeline from "@/src/components/session/SessionTimeline";
import { DUMMY_SESSION_DETAIL } from "@/src/lib/dummyData";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  const detail =
    id === DUMMY_SESSION_DETAIL.id
      ? DUMMY_SESSION_DETAIL
      : {
          ...DUMMY_SESSION_DETAIL,
          id,
          name: `Session · ${id}`,
          dateLabel: "Demo layout · placeholder",
        };

  return (
    <AppShell>
      <Link
        href="/"
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
    </AppShell>
  );
}
