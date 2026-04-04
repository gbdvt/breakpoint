import { useParams } from "react-router-dom";
import SessionAttentionStrip from "@/components/session/SessionAttentionStrip";
import NavBackButton from "@/components/ui/NavBackButton";
import PageTopDragRow from "@/components/ui/PageTopDragRow";
import SessionDetailHeader from "@/components/session/SessionDetailHeader";
import SessionDetailPanel from "@/components/session/SessionDetailPanel";
import SessionDomainTrail from "@/components/session/SessionDomainTrail";
import SessionDriftChart from "@/components/session/SessionDriftChart";
import SessionSummaryCards from "@/components/session/SessionSummaryCards";
import SessionTimeline from "@/components/session/SessionTimeline";
import { useDesktopData } from "@/context/DesktopDataContext";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import {
  buildAttentionSegments,
  buildDriftSeries,
  domainHopSequence,
  type DebriefSessionWindow,
} from "@/lib/debriefTimeline";
import { buildLiveSessionDetail, sessionIsLive } from "@/lib/liveSessionDetail";
import { completedToSessionDetail } from "@/lib/sessionStats";

export default function SessionDetailView() {
  const { id } = useParams();
  const feed = useChromeBridgeFeed();
  const { completedSessions } = useDesktopData();

  if (id === "live") {
    if (!feed) {
      return (
        <>
          <PageTopDragRow />
          <p className="text-[12px] text-white/45">Loading session…</p>
        </>
      );
    }
    if (!sessionIsLive(feed.session)) {
      return (
        <>
          <PageTopDragRow>
            <NavBackButton to="/sessions" aria-label="Back to sessions" />
          </PageTopDragRow>
          <p className="text-[13px] text-white/45">No active session.</p>
        </>
      );
    }
    const detail = buildLiveSessionDetail(feed);
    if (!detail) {
      return null;
    }
    const liveWindow: DebriefSessionWindow = {
      startedAt: feed.session.startedAt,
    };
    const liveDriftSeries = buildDriftSeries(liveWindow, feed.events);
    const liveAttention = buildAttentionSegments(liveWindow, feed.events);
    const liveHops = domainHopSequence(feed.events);

    return (
      <>
        <PageTopDragRow>
          <NavBackButton to="/sessions" aria-label="Back to sessions" />
        </PageTopDragRow>
        <div className="space-y-4">
          <SessionDetailHeader detail={detail} />
          <SessionDriftChart data={liveDriftSeries} />
          <SessionDomainTrail domains={liveHops} />
          <SessionAttentionStrip segments={liveAttention} />
          <SessionDetailPanel detail={detail} />
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
        <PageTopDragRow>
          <NavBackButton to="/sessions" aria-label="Back to sessions" />
        </PageTopDragRow>
        <p className="text-[13px] text-white/45">
          Session not found. It may have been recorded on another device or
          cleared from this machine.
        </p>
      </>
    );
  }

  const detail = completedToSessionDetail(saved);
  const debriefWindow = {
    startedAt: saved.startedAt,
    endedAt: saved.endedAt,
  };
  const driftSeries = buildDriftSeries(debriefWindow, saved.events);
  const attentionSegments = buildAttentionSegments(
    debriefWindow,
    saved.events,
  );
  const domainHops = domainHopSequence(saved.events);

  return (
    <>
      <PageTopDragRow>
        <NavBackButton to="/sessions" aria-label="Back to sessions" />
      </PageTopDragRow>
      <div className="space-y-4">
        <SessionDetailHeader detail={detail} />
        <SessionDriftChart data={driftSeries} />
        <SessionDomainTrail domains={domainHops} />
        <SessionAttentionStrip segments={attentionSegments} />
        <SessionDetailPanel detail={detail} />
        <SessionSummaryCards
          durationMin={detail.durationMin}
          tasksCompleted={detail.tasksCompleted}
          distractions={detail.distractions}
          queueCostMin={detail.queueCostMin}
        />
        {saved.completedTaskTitles && saved.completedTaskTitles.length > 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/35">
              Checked off this session
            </p>
            <ul className="mt-2.5 space-y-2 text-[13px] leading-snug text-white/72">
              {saved.completedTaskTitles.map((title, i) => (
                <li key={`${i}-${title.slice(0, 24)}`}>{title}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <SessionTimeline events={detail.timeline} />
      </div>
    </>
  );
}
