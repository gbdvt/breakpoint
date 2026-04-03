"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import type { Project } from "@/lib/dummyData";

type Props = {
  projects: Project[];
};

export default function ProjectsPanel({ projects }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <GlassPanel variant="subtle" className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide text-white/90">
            Projects
          </h2>
          {!open ? (
            <p className="mt-0.5 text-[11px] text-white/45">
              Collapsed · tap to expand
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-white/35">{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-2 border-t border-white/[0.06] pt-3">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl px-2 py-2 text-[12px] hover:bg-white/[0.04]"
                >
                  <span className="font-medium text-white/85">{p.name}</span>
                  <span className="font-mono text-[11px] tabular-nums text-white/40">
                    {p.taskCount} tasks · {p.sessionsThisWeek} sess/wk
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassPanel>
  );
}
