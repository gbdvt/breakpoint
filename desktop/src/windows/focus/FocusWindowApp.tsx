import GreetingHeader from "@/components/dashboard/GreetingHeader";
import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import TaskItem from "@/components/dashboard/TaskItem";
import { DUMMY_SESSIONS, DUMMY_TASKS } from "@/lib/dummyData";
import {
  focusMainWindow,
  isTauri,
  openFloatingWindow,
} from "@/lib/tauriBridge";

export default function FocusWindowApp() {
  return (
    <div className="relative min-h-screen overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#060a14]" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-[#0c1430] to-[#050818]" />
        <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-indigo-600/15 blur-[80px]" />
      </div>

      <div className="flex max-h-screen flex-col px-4 py-5">
        <GreetingHeader name="Gaspar" />
        <p className="mb-4 text-[11px] text-white/45">
          Compact focus control center · side-panel density
        </p>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isTauri()) void openFloatingWindow();
            }}
            className="flex-1 rounded-xl border border-indigo-400/30 bg-indigo-600/25 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-indigo-950/40 disabled:opacity-40"
            disabled={!isTauri()}
          >
            Floating session
          </button>
          <button
            type="button"
            onClick={() => {
              if (isTauri()) void focusMainWindow();
            }}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[12px] font-medium text-white/75 disabled:opacity-40"
            disabled={!isTauri()}
          >
            Main
          </button>
        </div>

        <GlassPanel className="mb-3 flex min-h-0 flex-1 flex-col p-3">
          <SectionHeader title="Now" subtitle="Top tasks" />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {DUMMY_TASKS.slice(0, 4).map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel variant="subtle" className="p-3">
          <SectionHeader title="Recent" subtitle="Sessions" />
          <div className="max-h-40 space-y-0.5 overflow-y-auto">
            {DUMMY_SESSIONS.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] font-mono text-[9px] text-white/70">
                  <span className="text-white/90">{s.durationMin}</span>
                  <span className="text-[7px] uppercase text-white/35">m</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white/85">
                    {s.title}
                  </p>
                  <p className="text-[10px] text-white/40">{s.startedAt}</p>
                </div>
                <span className="text-[9px] text-rose-300/80">
                  {s.distractions} drift
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
