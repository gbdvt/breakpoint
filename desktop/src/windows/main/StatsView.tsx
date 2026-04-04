import { useMemo } from "react";
import FocusChartPanel from "@/components/stats/FocusChartPanel";
import FocusScoreCard from "@/components/stats/FocusScoreCard";
import MetricsGrid from "@/components/stats/MetricsGrid";
import PersonalBestsCard from "@/components/stats/PersonalBestsCard";
import StatsHeader from "@/components/stats/StatsHeader";
import { useDesktopData } from "@/context/DesktopDataContext";
import { buildStatsBundle } from "@/lib/sessionStats";

export default function StatsView() {
  const { completedSessions } = useDesktopData();
  const stats = useMemo(
    () => buildStatsBundle(completedSessions),
    [completedSessions],
  );

  return (
    <>
      <StatsHeader />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <FocusChartPanel data={stats.chartWeek} />
          <MetricsGrid
            hoursWorked={stats.hoursWorked}
            distractions={stats.distractions}
            tasksDone={stats.tasksDone}
            sessions={stats.sessions}
            timeDistractedMin={stats.timeDistractedMin}
            avgDistractedPerSession={stats.avgDistractedPerSession}
          />
        </div>
        <div className="space-y-5">
          <FocusScoreCard score={stats.focusScore} />
          <PersonalBestsCard items={stats.personalBests} />
        </div>
      </div>
    </>
  );
}
