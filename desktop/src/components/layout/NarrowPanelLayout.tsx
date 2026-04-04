"use client";

import { AnimatePresence } from "framer-motion";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import CircleDrawer from "@/components/social/CircleDrawer";
import SettingsSheet from "@/components/home/SettingsSheet";
import PanelSessionDock from "@/components/session/PanelSessionDock";
import type { HomeOutletContext } from "@/lib/homeOutlet";
import {
  closeMainWindow,
  isTauri,
  minimizeMainWindow,
  openFloatingWindow,
} from "@/lib/tauriBridge";

export default function NarrowPanelLayout() {
  const pathname = useLocation().pathname;

  const [circleOpen, setCircleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const outletContext: HomeOutletContext = {
    openFriends: () => setCircleOpen(true),
    openSettings: () => setSettingsOpen(true),
  };

  async function openHud() {
    if (!isTauri()) return;
    await openFloatingWindow();
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden font-[family-name:var(--font-sans)]">
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

      <div
        className={`mx-auto flex h-[100dvh] w-full max-w-[400px] flex-col px-3 pb-2 ${isTauri() ? "pt-0" : "pt-3"}`}
      >
        {isTauri() ? (
          <div
            data-tauri-drag-region
            className="shrink-0 cursor-grab pt-3 pb-1 active:cursor-grabbing"
            aria-hidden
          />
        ) : null}
        <div className="glass-card-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] shadow-[0_20px_64px_rgba(0,0,0,0.45)]">
          <header className="shrink-0 border-b border-white/[0.06]">
            <div
              className="flex items-center justify-end gap-1 px-3 py-2.5"
              data-tauri-drag-region
            >
              <div className="no-drag flex flex-1 items-center justify-end gap-1">
                {isTauri() ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void openHud()}
                      className="flex size-8 items-center justify-center rounded-xl border border-cyan-100/[0.1] bg-white/[0.05] text-[11px] text-fuchsia-200/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:border-cyan-100/[0.14] hover:bg-white/[0.08]"
                      aria-label="HUD"
                    >
                      ◎
                    </button>
                    <button
                      type="button"
                      onClick={() => void minimizeMainWindow()}
                      className="flex size-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[15px] font-light leading-none text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:bg-white/[0.08] hover:text-white/88"
                      aria-label="Minimize"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => void closeMainWindow()}
                      className="flex size-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[14px] font-light leading-none text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition hover:border-rose-300/25 hover:bg-rose-500/15 hover:text-rose-100"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {pathname === "/stats" || pathname === "/sessions" ? (
              <div className="no-drag border-t border-white/[0.05] px-3 py-2">
                <Link
                  to="/"
                  className="text-[12px] text-white/45 transition hover:text-white/75"
                >
                  ← Back
                </Link>
              </div>
            ) : null}
          </header>

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-3 pt-1">
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
