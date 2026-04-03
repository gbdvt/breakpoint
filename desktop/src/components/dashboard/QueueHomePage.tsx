import ChromeActivityFeed from "@/components/dashboard/ChromeActivityFeed";
import ChromeBridgeStatus from "@/components/dashboard/ChromeBridgeStatus";
import DesktopSessionPanel from "@/components/dashboard/DesktopSessionPanel";
import ProjectsPanel from "@/components/dashboard/ProjectsPanel";
import StartSessionButton from "@/components/dashboard/StartSessionButton";
import TaskItem from "@/components/dashboard/TaskItem";
import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { DUMMY_PROJECTS, DUMMY_TASKS } from "@/lib/dummyData";
import { sessionIsLive } from "@/lib/liveSessionDetail";

export default function QueueHomePage() {
  const feed = useChromeBridgeFeed();
  const firstOpen = DUMMY_TASKS.find((t) => !t.done)?.id;
  const live = feed && sessionIsLive(feed.session);
  const firstName = "Gaspar";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-white/45">
          Good evening · {firstName}
        </p>
        <p className="mt-0.5 text-[12px] text-white/55">
          {live && feed?.session
            ? `In session: ${feed.session.goal.slice(0, 80)}${feed.session.goal.length > 80 ? "…" : ""}`
            : `${DUMMY_TASKS.filter((t) => !t.done).length} tasks in queue (local) · browsing feed below`}
        </p>
      </div>

      <DesktopSessionPanel />

      <ChromeBridgeStatus feed={feed} />

      <ChromeActivityFeed events={feed?.events ?? []} />

      <StartSessionButton />

      <GlassPanel className="p-3">
        <SectionHeader
          title="Task queue"
          subtitle="Local preview — tasks are not synced from Chrome yet"
        />
        <div className="divide-y divide-white/[0.06]">
          {DUMMY_TASKS.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              queue
              active={task.id === firstOpen}
            />
          ))}
        </div>
      </GlassPanel>

      <ProjectsPanel projects={DUMMY_PROJECTS} />
    </div>
  );
}
