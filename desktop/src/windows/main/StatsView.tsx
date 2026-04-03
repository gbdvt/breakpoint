import FocusChartPanel from "@/components/stats/FocusChartPanel";
import FocusScoreCard from "@/components/stats/FocusScoreCard";
import MetricsGrid from "@/components/stats/MetricsGrid";
import PersonalBestsCard from "@/components/stats/PersonalBestsCard";
import StatsHeader from "@/components/stats/StatsHeader";
import {
  CHART_WEEK,
  PERSONAL_BESTS,
  STATS_METRICS,
} from "@/lib/dummyData";

export default function StatsView() {
  return (
    <>
      <StatsHeader />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <FocusChartPanel data={CHART_WEEK} />
          <MetricsGrid
            hoursWorked={STATS_METRICS.hoursWorked}
            distractions={STATS_METRICS.distractions}
            tasksDone={STATS_METRICS.tasksDone}
            sessions={STATS_METRICS.sessions}
            timeDistractedMin={STATS_METRICS.timeDistractedMin}
            avgDistractedPerSession={STATS_METRICS.avgDistractedPerSession}
          />
        </div>
        <div className="space-y-5">
          <FocusScoreCard score={STATS_METRICS.focusScore} />
          <PersonalBestsCard items={PERSONAL_BESTS} />
        </div>
      </div>
    </>
  );
}
