"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function StartSessionButton() {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="mt-6"
    >
      <Link
        href="/focus/start"
        className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-indigo-400/30 bg-gradient-to-r from-indigo-600/90 via-blue-600/85 to-violet-600/80 px-6 py-4 text-[14px] font-semibold text-white shadow-[0_12px_40px_rgba(79,70,229,0.35)] transition hover:border-indigo-300/40 hover:shadow-[0_16px_48px_rgba(79,70,229,0.42)]"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.08) inset, 0 12px 40px rgba(79,70,229,0.35)",
        }}
      >
        <span className="opacity-90">Start work session</span>
        <span className="text-white/60">↗</span>
      </Link>
      <p className="mt-2 text-center text-[11px] text-white/35">
        Opens live extension flow · distraction detection runs in Chrome
      </p>
    </motion.div>
  );
}
