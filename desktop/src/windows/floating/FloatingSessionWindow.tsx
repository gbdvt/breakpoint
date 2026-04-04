"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { closeFloatingWindow } from "@/lib/tauriBridge";
import { distractionCount, sessionIsLive } from "@/lib/liveSessionDetail";

/**
 * HUD pill — shows latest Chrome / extension activity when a session is live.
 */
export default function FloatingSessionWindow() {
  const feed = useChromeBridgeFeed();
  const live = feed && sessionIsLive(feed.session);
  const events = feed?.events ?? [];
  const last = events.length ? events[events.length - 1] : null;
  const dCount = distractionCount(events.slice(-12));

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const session = feed?.session;
  const time = useMemo(() => {
    const elapsedSec =
      live && session
        ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
        : 0;
    const mm = Math.floor(elapsedSec / 60);
    const ss = elapsedSec % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }, [live, session, tick]);

  const domain = last?.domain ?? "—";
  const line =
    last?.title && last.title.trim().length
      ? last.title.trim().slice(0, 80) + (last.title.length > 80 ? "…" : "")
      : live
        ? "Watching tab activity from Chrome"
        : "No session — start one in the web app";

  const dismiss = useCallback(async () => {
    try {
      await closeFloatingWindow();
    } catch {
      window.close();
    }
  }, []);

  const [onTop, setOnTop] = useState(true);
  const togglePin = useCallback(async () => {
    try {
      const { toggleFloatingAlwaysOnTop } = await import("@/lib/tauriBridge");
      const next = await toggleFloatingAlwaysOnTop();
      setOnTop(next);
    } catch {
      setOnTop((v) => !v);
    }
  }, []);

  return (
    <div className="floating-hud-layout font-[family-name:var(--font-sans)]">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        data-tauri-drag-region
        className="flex w-full max-w-[min(100%,520px)] cursor-grab items-center gap-3 rounded-full border border-sky-200/25 px-3.5 py-2 active:cursor-grabbing"
        style={{
          background:
            "linear-gradient(125deg, rgba(59,130,246,0.5) 0%, rgba(14,165,233,0.38) 42%, rgba(15,23,42,0.62) 100%)",
          backdropFilter: "blur(32px) saturate(1.7)",
          WebkitBackdropFilter: "blur(32px) saturate(1.7)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.14) inset, 0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 40px rgba(37,99,235,0.28), 0 4px 16px rgba(15,23,42,0.35)",
        }}
      >
        <span className="shrink-0 text-[14px] font-semibold tabular-nums tracking-tight text-white">
          {time}
        </span>

        <span className="no-drag flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-300/95 text-[11px] font-bold text-sky-950 shadow-sm">
          {dCount > 9 ? "9+" : dCount}
        </span>

        <p className="min-w-0 flex-1 text-[11px] leading-snug text-sky-50/95">
          <span className="font-medium text-white">{domain}</span>
          <span className="text-white/80"> — {line}</span>
        </p>

        <div className="no-drag flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void togglePin()}
            className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold text-white/90 hover:bg-white/25"
          >
            {onTop ? "On top" : "Float"}
          </button>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-white/20"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </div>
  );
}
