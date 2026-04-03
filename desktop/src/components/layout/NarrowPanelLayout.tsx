"use client";

import { AnimatePresence } from "framer-motion";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import CircleDrawer from "@/components/social/CircleDrawer";
import PanelSessionDock from "@/components/session/PanelSessionDock";
import {
  closeMainWindow,
  isTauri,
  minimizeMainWindow,
  openFloatingWindow,
} from "@/lib/tauriBridge";

const TABS: { to: string; label: string }[] = [
  { to: "/", label: "Queue" },
  { to: "/sessions", label: "Sessions" },
  { to: "/stats", label: "Stats" },
];

export default function NarrowPanelLayout() {
  const pathname = useLocation().pathname;
  const [circleOpen, setCircleOpen] = useState(false);
  const [hudError, setHudError] = useState<string | null>(null);

  async function openHud() {
    setHudError(null);
    if (!isTauri()) {
      setHudError("Run inside Tauri (npm run tauri:dev) for the floating HUD.");
      return;
    }
    const res = await openFloatingWindow();
    if (!res.ok) {
      setHudError(res.error ?? "Could not open floating window.");
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden font-[family-name:var(--font-plus-jakarta)]">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#060a14]" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/95 via-[#0a1028] to-[#050818]" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-600/18 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-violet-700/12 blur-[90px]" />
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
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          style={{
            background:
              "linear-gradient(165deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 40%, rgba(15,23,42,0.45) 100%)",
            backdropFilter: "blur(32px) saturate(1.35)",
            WebkitBackdropFilter: "blur(32px) saturate(1.35)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 0 rgba(255,255,255,0.1) inset, 0 24px 80px rgba(0,0,0,0.55)",
          }}
        >
          <header className="shrink-0 border-b border-white/[0.08]">
            <div className="px-4 pb-3 pt-3" data-tauri-drag-region>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">
                    Breakpoint
                  </p>
                  <p className="text-[15px] font-semibold text-white/95">Panel</p>
                </div>
                <div className="no-drag flex items-center gap-1">
                  {isTauri() ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void minimizeMainWindow()}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-[15px] font-light leading-none text-white/75 hover:bg-white/[0.1]"
                        aria-label="Minimize window"
                        title="Minimize"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => void closeMainWindow()}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-[14px] font-light leading-none text-white/75 hover:bg-rose-500/25 hover:text-rose-100"
                        aria-label="Close window"
                        title="Close"
                      >
                        ×
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void openHud()}
                    className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-fuchsia-100/95 hover:bg-fuchsia-500/25"
                    title="Distraction / live HUD (always on top)"
                  >
                    HUD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCircleOpen(true)}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[13px] text-white/70 hover:bg-white/[0.1]"
                    aria-label="Your Circle"
                  >
                    ⌁
                  </button>
                </div>
              </div>
              <nav className="mt-3 flex gap-1.5">
                {TABS.map((t) => {
                  const active =
                    t.to === "/"
                      ? pathname === "/"
                      : pathname === t.to || pathname.startsWith(`${t.to}/`);
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                        active
                          ? "bg-white/[0.14] text-white"
                          : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
                      }`}
                    >
                      {t.label}
                    </Link>
                  );
                })}
              <Link
                to="/session/live"
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  pathname.startsWith("/session/")
                    ? "bg-white/[0.14] text-white"
                    : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
                }`}
              >
                Live
              </Link>
              </nav>
              {hudError ? (
                <p className="mt-2 text-[10px] leading-snug text-amber-300/90">
                  {hudError}
                </p>
              ) : null}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
            <Outlet />
          </main>

          <PanelSessionDock />
        </div>
      </div>

      <AnimatePresence>
        {circleOpen ? (
          <CircleDrawer onClose={() => setCircleOpen(false)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
