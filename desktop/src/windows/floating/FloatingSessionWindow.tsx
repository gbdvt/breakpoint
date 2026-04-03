"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { closeFloatingWindow } from "@/lib/tauriBridge";

function formatElapsed(totalSec: number): { m: string; s: string } {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return { m: String(m), s: s.toString().padStart(2, "0") };
}

export default function FloatingSessionWindow() {
  const [sec, setSec] = useState(47 * 60 + 12);
  const drifts = 1;
  const [onTop, setOnTop] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { m, s } = formatElapsed(sec);

  const endSession = useCallback(async () => {
    try {
      await closeFloatingWindow();
    } catch {
      window.close();
    }
  }, []);

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
    <div className="flex min-h-screen items-center justify-center p-3 font-[family-name:var(--font-plus-jakarta)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="w-full max-w-[480px]"
      >
        <div
          data-tauri-drag-region
          className="mb-1 flex cursor-grab items-center justify-between rounded-t-[18px] border border-white/[0.1] border-b-0 bg-white/[0.06] px-3 py-2 backdrop-blur-xl active:cursor-grabbing"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Breakpoint
          </span>
          <div className="flex items-center gap-1.5 no-drag">
            <button
              type="button"
              onClick={() => void togglePin()}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                onTop
                  ? "bg-indigo-500/25 text-indigo-200"
                  : "bg-white/[0.06] text-white/50"
              }`}
            >
              {onTop ? "Pinned" : "Pin"}
            </button>
          </div>
        </div>

        <div
          className="rounded-b-[18px] rounded-t-none border border-white/[0.12] border-t-0 bg-[#0a1024]/72 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.05) inset, 0 20px 50px rgba(0,0,0,0.55)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex shrink-0 items-baseline gap-0.5 font-mono text-[13px] tabular-nums text-white/95"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
            >
              <span className="text-xl font-semibold tracking-tight">{m}</span>
              <span className="text-white/35">:</span>
              <span className="text-xl font-semibold tracking-tight">{s}</span>
            </div>
            <div className="h-9 w-px bg-white/[0.08]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white/90">
                Ship drift overlay copy + timing
              </p>
              <p className="truncate text-[10px] text-white/40">
                Queue ~18m est · focus calm
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-md border border-emerald-400/25 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-medium text-emerald-300/90">
                In flow
              </span>
              <span className="rounded-md border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-medium text-rose-200/85">
                {drifts} drift{drifts === 1 ? "" : "s"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void endSession()}
              className="shrink-0 rounded-xl border border-rose-400/35 bg-rose-500/20 px-3 py-2 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
            >
              End
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[9px] text-white/35">
          Drag the top strip to move · desktop overlay
        </p>
      </motion.div>
    </div>
  );
}
