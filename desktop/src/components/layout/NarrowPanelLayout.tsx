"use client";

import { AnimatePresence } from "framer-motion";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import CircleDrawer from "@/components/social/CircleDrawer";
import SettingsSheet from "@/components/home/SettingsSheet";
import PanelSessionDock from "@/components/session/PanelSessionDock";
import type { HomeOutletContext } from "@/lib/homeOutlet";
import { isTauri } from "@/lib/tauriBridge";

export default function NarrowPanelLayout() {
  const tauri = isTauri();

  const [circleOpen, setCircleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const outletContext: HomeOutletContext = {
    openFriends: () => setCircleOpen(true),
    openSettings: () => setSettingsOpen(true),
  };

  return (
    <div
      className={`font-[family-name:var(--font-sans)] ${tauri ? "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-transparent" : "relative min-h-[100dvh] overflow-hidden"}`}
    >
      {!tauri ? (
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
          <div className="absolute inset-0 bg-[#070b16]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1226] via-[#080d1a] to-[#050810]" />
          <div className="absolute -top-28 left-1/2 h-[380px] w-[min(100%,520px)] -translate-x-1/2 rounded-full bg-indigo-500/14 blur-[88px]" />
          <div className="absolute bottom-0 right-0 h-[280px] w-[280px] rounded-full bg-violet-600/10 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(118deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 20px)",
              maskImage:
                "radial-gradient(ellipse 90% 70% at 100% 100%, black 0%, transparent 68%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 90% 70% at 100% 100%, black 0%, transparent 68%)",
            }}
          />
        </div>
      ) : null}

      <div
        className={
          tauri
            ? "flex h-full min-h-0 w-full flex-1 flex-col"
            : "mx-auto flex h-[100dvh] w-full max-w-[400px] flex-col px-4 pb-3 pt-4"
        }
      >
        <div
          className={`glass-card-strong flex min-h-0 flex-col overflow-hidden shadow-[0_20px_64px_rgba(0,0,0,0.45)] ${tauri ? "h-full min-h-0 flex-1 rounded-[22px]" : "min-h-0 flex-1 rounded-[22px]"}`}
        >
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-3">
              <Outlet context={outletContext} />
            </div>
            <PanelSessionDock />
          </main>
        </div>
      </div>

      <AnimatePresence>
        {circleOpen ? (
          <CircleDrawer onClose={() => setCircleOpen(false)} />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {settingsOpen ? (
          <SettingsSheet onClose={() => setSettingsOpen(false)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
