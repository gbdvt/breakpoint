"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { sessionIsLive } from "@/lib/liveSessionDetail";
import { isTauri, queueSessionEnd } from "@/lib/tauriBridge";

export default function PanelSessionDock() {
  const feed = useChromeBridgeFeed();
  const live = feed && sessionIsLive(feed.session);
  const session = feed?.session;

  const [tick, setTick] = useState(0);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  void tick;

  if (!live || !session) {
    return null;
  }

  const goalLine =
    session.goal.length > 56
      ? `${session.goal.slice(0, 56)}…`
      : session.goal;

  const elapsedSec = Math.max(
    0,
    Math.floor((Date.now() - session.startedAt) / 1000),
  );
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const time = `${m}:${s.toString().padStart(2, "0")}`;

  const plannedSec = session.durationMin * 60;
  const pct =
    plannedSec > 0
      ? Math.min(100, Math.round((elapsedSec / plannedSec) * 100))
      : 0;

  async function endSession() {
    if (!isTauri() || ending) return;
    setEnding(true);
    try {
      await queueSessionEnd();
    } catch {
      /* extension will pick up on next poll retry */
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="shrink-0 space-y-2 border-t border-white/[0.06] px-3 pb-3 pt-2.5">
      <div className="glass-card flex items-center gap-3 px-3 py-2.5">
        <span className="shrink-0 text-[15px] font-semibold tabular-nums tracking-tight text-white">
          {time}
        </span>
        <div className="h-4 w-px shrink-0 bg-white/[0.1]" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium leading-snug text-white/80">
          {goalLine}
        </p>
        <div className="relative flex size-9 shrink-0 items-center justify-center">
          <svg className="absolute size-9 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="url(#dockGrad)"
              strokeWidth="2"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="dockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(125, 211, 252)" />
                <stop offset="100%" stopColor="rgb(165, 180, 252)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-[9px] font-semibold tabular-nums text-white/65">
            {pct}%
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to="/session/live"
          className="glass-card flex flex-1 items-center justify-center py-3 text-[13px] font-semibold text-white/88 hover:bg-white/[0.04]"
        >
          Breakdown
        </Link>
        <button
          type="button"
          disabled={ending || !isTauri()}
          onClick={() => void endSession()}
          className="flex-[1.2] rounded-2xl border border-rose-300/20 bg-rose-500/[0.12] py-3 text-[13px] font-semibold text-rose-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:bg-rose-500/[0.18] disabled:opacity-40"
        >
          {ending ? "…" : "End session"}
        </button>
      </div>
    </div>
  );
}
