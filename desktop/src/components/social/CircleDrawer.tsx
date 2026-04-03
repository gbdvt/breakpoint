"use client";

import { motion } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import CircleUserItem from "@/components/social/CircleUserItem";
import ActivityFeed from "@/components/social/ActivityFeed";
import { DUMMY_CIRCLE } from "@/lib/dummyData";

type Props = {
  onClose: () => void;
};

export default function CircleDrawer({ onClose }: Props) {
  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: 120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed right-4 top-4 z-[70] flex h-[calc(100vh-2rem)] w-[min(360px,calc(100vw-2rem))] flex-col"
      >
        <GlassPanel variant="elevated" className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/70">
                  Accountability
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Your Circle
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60 transition hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">
              Lightweight presence — no noise. (Placeholder data for UI.)
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-0.5">
              {DUMMY_CIRCLE.map((u) => (
                <CircleUserItem key={u.id} user={u} />
              ))}
            </div>
            <div className="my-4 h-px bg-white/[0.06]" />
            <ActivityFeed />
          </div>
        </GlassPanel>
      </motion.aside>
    </>
  );
}
