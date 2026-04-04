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

  const elapsedSec = Math.max(
    0,
    Math.floor((Date.now() - session.startedAt) / 1000),
  );
  const m = Math.floor(elapsedSec / 60);
  const s = elapsedSec % 60;
  const time = `${m}:${s.toString().padStart(2, "0")}`;

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
    <div className="shrink-0 border-t border-white/[0.06] px-4 pb-4 pt-3">
      <div className="glass-card flex items-center gap-3 px-4 py-3">
        <span
          className="size-2 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.45)]"
          aria-hidden
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/38">
          Session
        </span>
        <span className="text-[15px] font-semibold tabular-nums tracking-tight text-white">
          {time}
        </span>
        <div className="min-w-0 flex-1" />
        <Link
          to="/session/live"
          className="shrink-0 text-[11px] font-medium text-white/35 transition hover:text-white/55"
        >
          Details
        </Link>
        <button
          type="button"
          disabled={ending || !isTauri()}
          onClick={() => void endSession()}
          className="shrink-0 rounded-xl border border-rose-300/22 bg-rose-500/[0.14] px-3 py-2 text-[12px] font-semibold text-rose-100/95 transition hover:bg-rose-500/[0.2] disabled:opacity-40"
        >
          {ending ? "…" : "End"}
        </button>
      </div>
    </div>
  );
}
