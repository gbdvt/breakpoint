"use client";

import { useEffect, useState } from "react";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { sessionIsLive } from "@/lib/liveSessionDetail";
import { DUMMY_TASKS } from "@/lib/dummyData";

const fallbackTask =
  DUMMY_TASKS.find((t) => !t.done)?.title ?? "No active task";

/**
 * Bottom dock — shows live Chrome session goal + elapsed when linked; else mock task.
 */
export default function PanelSessionDock() {
  const feed = useChromeBridgeFeed();
  const live = feed && sessionIsLive(feed.session);
  const session = feed?.session;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const goalLine =
    live && session
      ? session.goal.length > 56
        ? `${session.goal.slice(0, 56)}…`
        : session.goal
      : fallbackTask;

  const elapsedSec =
    live && session
      ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
      : tick;
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const time = `${m}:${s.toString().padStart(2, "0")}`;

  const plannedSec = live && session ? session.durationMin * 60 : 0;
  const pct =
    live && session && plannedSec > 0
      ? Math.min(100, Math.round((elapsedSec / plannedSec) * 100))
      : 0;

  return (
    <div className="shrink-0 border-t border-white/[0.08] px-3 pb-3 pt-2">
      <div
        className="flex items-center gap-2.5 rounded-2xl border border-white/[0.1] px-3 py-2.5"
        style={{
          background: "rgba(15,23,42,0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        <span
          className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-white/90"
          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
        >
          {time}
        </span>
        <span className="text-white/30" aria-hidden>
          ☰
        </span>
        <span className="text-white/35" aria-hidden>
          ▢
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/85">
          {goalLine}
        </p>
        <div className="relative flex size-9 shrink-0 items-center justify-center">
          <svg className="absolute size-9 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="url(#dockGrad)"
              strokeWidth="2.5"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="dockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(129, 140, 248)" />
                <stop offset="100%" stopColor="rgb(56, 189, 248)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-[9px] font-semibold text-white/70">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
