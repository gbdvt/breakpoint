"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Props = {
  userFirstName?: string;
};

export default function FloatingSessionBar({ userFirstName }: Props) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 px-4"
    >
      <div
        className="flex items-center gap-4 rounded-[26px] border border-white/[0.12] bg-[#0a1024]/75 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex shrink-0 items-baseline gap-1 font-mono text-[13px] tabular-nums text-white/90">
          <span className="text-lg font-semibold tracking-tight">47</span>
          <span className="text-white/40">:</span>
          <span className="text-lg font-semibold tracking-tight">12</span>
        </div>
        <div className="h-8 w-px bg-white/[0.08]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-white/90">
            Ship drift overlay copy + timing
          </p>
          <p className="truncate text-[10px] text-white/40">
            Breakpoint · queue ~18m est · drift calm
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300/90">
            In flow
          </span>
          <span className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200/85">
            1 drift
          </span>
        </div>
        <Link
          href="/debrief"
          className="shrink-0 rounded-xl border border-white/[0.1] bg-rose-500/15 px-3 py-2 text-[11px] font-semibold text-rose-200/95 transition hover:bg-rose-500/25"
        >
          End
        </Link>
      </div>
      <p className="mt-2 text-center text-[10px] text-white/30">
        Preview bar · {userFirstName ? `${userFirstName}, ` : ""}
        <Link href="/focus/start" className="underline decoration-white/20 hover:text-white/50">
          start a tracked session
        </Link>{" "}
        to drive this from the extension.
      </p>
    </motion.div>
  );
}
