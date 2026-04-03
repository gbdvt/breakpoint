import GreetingHeader from "@/components/dashboard/GreetingHeader";
import ProjectsPanel from "@/components/dashboard/ProjectsPanel";
import StartSessionButton from "@/components/dashboard/StartSessionButton";
import TasksPanel from "@/components/dashboard/TasksPanel";
import WorkSessionsPanel from "@/components/dashboard/WorkSessionsPanel";
import GlassPanel from "@/components/ui/GlassPanel";
import {
  DUMMY_PROJECTS,
  DUMMY_SESSIONS,
  DUMMY_TASKS,
} from "@/lib/dummyData";

export default function DashboardPage() {
  return (
    <>
      <GreetingHeader name="Gaspar" />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <TasksPanel tasks={DUMMY_TASKS} />
          <ProjectsPanel projects={DUMMY_PROJECTS} />
          <StartSessionButton />
        </div>

        <div className="space-y-5">
          <WorkSessionsPanel sessions={DUMMY_SESSIONS} />
          <GlassPanel variant="subtle" className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              At a glance
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[10px] text-white/40">This week</p>
                <p className="mt-1 font-mono text-lg font-semibold text-emerald-300/90">
                  26.4h
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[10px] text-white/40">Drifts</p>
                <p className="mt-1 font-mono text-lg font-semibold text-rose-300/85">
                  34
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              Room for queue-cost and warning chips when you wire real metrics.
            </p>
          </GlassPanel>
        </div>
      </div>
    </>
  );
}
