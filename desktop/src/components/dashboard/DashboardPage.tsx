import GreetingHeader from "@/components/dashboard/GreetingHeader";
import ProjectsPanel from "@/components/dashboard/ProjectsPanel";
import StartSessionButton from "@/components/dashboard/StartSessionButton";
import TasksPanel from "@/components/dashboard/TasksPanel";
import WorkSessionsPanel from "@/components/dashboard/WorkSessionsPanel";
import GlassPanel from "@/components/ui/GlassPanel";
import { loadDesktopStore } from "@/lib/desktopStore";
import {
  buildStatsBundle,
  completedToWorkSessionListItem,
} from "@/lib/sessionStats";

/** Legacy wide layout; main app uses QueueHomePage. Reads the same local store. */
export default function DashboardPage() {
  const { tasks, completedSessions } = loadDesktopStore();
  const sessions = completedSessions
    .slice(0, 12)
    .map(completedToWorkSessionListItem);
  const stats = buildStatsBundle(completedSessions);

  return (
    <>
      <GreetingHeader name="Gaspar" />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <TasksPanel tasks={tasks} />
          <ProjectsPanel projects={[]} />
          <StartSessionButton />
        </div>

        <div className="space-y-5">
          <WorkSessionsPanel sessions={sessions} />
          <GlassPanel variant="subtle" className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              At a glance
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[10px] text-white/40">All-time hours</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-emerald-300/90">
                  {stats.hoursWorked}h
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[10px] text-white/40">Drift events</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-rose-300/85">
                  {stats.distractions}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              Totals from completed sessions stored on this device.
            </p>
          </GlassPanel>
        </div>
      </div>
    </>
  );
}
