"use client";

import { motion } from "framer-motion";

type Props = { onClose: () => void };

export default function SettingsSheet({ onClose }: Props) {
  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="fixed bottom-6 left-1/2 z-[70] w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-white/[0.12] bg-[#0c1224]/95 px-5 py-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-white">Settings</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            Done
          </button>
        </div>
        <p className="mt-4 text-[13px] text-white/40">Soon.</p>
      </motion.div>
    </>
  );
}
