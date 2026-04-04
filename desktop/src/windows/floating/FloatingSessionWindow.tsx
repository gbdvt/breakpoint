"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { closeFloatingWindow } from "@/lib/tauriBridge";
import { sessionIsLive } from "@/lib/liveSessionDetail";

/** Minimal HUD: session timer only — drift feedback stays in the browser overlay. */
export default function FloatingSessionWindow() {
  const feed = useChromeBridgeFeed();
  const live = feed && sessionIsLive(feed.session);

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
        className="flex w-full max-w-[min(100%,320px)] cursor-grab items-center gap-3 rounded-full border border-white/[0.12] bg-white/[0.08] px-3.5 py-2 active:cursor-grabbing"
        style={{
          backdropFilter: "blur(28px) saturate(1.2)",
          WebkitBackdropFilter: "blur(28px) saturate(1.2)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06) inset, 0 10px 36px rgba(0,0,0,0.25)",
        }}
      >
        <span
          className="size-2 shrink-0 rounded-full bg-emerald-400/90"
          aria-hidden
        />
        <span className="text-[14px] font-semibold tabular-nums tracking-tight text-white">
          {time}
        </span>
        <span className="text-[11px] font-medium text-white/45">
          {live ? "Session" : "Idle"}
        </span>
        <div className="no-drag ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void togglePin()}
            className="rounded-full bg-white/[0.08] px-2 py-1 text-[9px] font-semibold text-white/75 hover:bg-white/[0.12]"
          >
            {onTop ? "Pin" : "Float"}
          </button>
          <button
            type="button"
            onClick={() => void dismiss()}
            className="rounded-full border border-white/[0.1] bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/[0.1]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
