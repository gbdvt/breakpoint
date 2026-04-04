"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Shared bottom sheet: same shell for Settings, Context, etc.
 * Uses a short ease (no bouncy spring).
 */
export default function BottomSheet({ title, onClose, children }: Props) {
  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.22, ease }}
        className="fixed bottom-6 left-1/2 z-[70] flex max-h-[min(72vh,calc(100dvh-3rem))] w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c1224]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
          <p id="bottom-sheet-title" className="text-[15px] font-semibold text-white">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-white/50 transition hover:bg-white/[0.06] hover:text-white"
          >
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </>
  );
}
