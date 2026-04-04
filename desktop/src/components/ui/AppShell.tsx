"use client";

import { AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useState } from "react";
import CircleDrawer from "@/components/social/CircleDrawer";
import GlassPanel from "@/components/ui/GlassPanel";
import {
  closeFloatingWindow,
  isTauri,
  openFloatingWindow,
  openFocusWindow,
} from "@/lib/tauriBridge";

const NAV = [
  { to: "/", label: "Home", icon: "◆" },
  { to: "/stats", label: "Stats", icon: "◇" },
  { to: "/session/demo-1", label: "Session", icon: "○" },
];

type Props = {
  children: ReactNode;
  userFirstName?: string;
};

export default function AppShell({
  children,
  userFirstName = "Gaspar",
}: Props) {
  const pathname = useLocation().pathname;
  const [circleOpen, setCircleOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden font-[family-name:var(--font-sans)]">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[#060a14]" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-[#0c1430] to-[#050818]" />
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -right-20 bottom-40 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full bg-violet-900/20 blur-[90px]" />
      </div>

      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] px-4 py-6">
          <Link to="/" className="mb-10 flex items-center gap-2.5 px-1">
            <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white/90 backdrop-blur-md">
              B
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-white">
                Breakpoint
              </p>
              <p className="text-[10px] text-white/40">Desktop</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  <span className="w-4 text-center text-[10px] opacity-70">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isTauri() ? (
            <GlassPanel variant="subtle" className="mt-2 p-3">
              <p className="text-[10px] font-medium text-white/40">
                Desktop windows
              </p>
              <button
                type="button"
                onClick={() => void openFloatingWindow()}
                className="mt-2 w-full rounded-lg border border-indigo-400/25 bg-indigo-500/15 py-2 text-[11px] font-semibold text-indigo-100 transition hover:bg-indigo-500/25"
              >
                Floating session bar
              </button>
              <button
                type="button"
                onClick={() => void openFocusWindow()}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 text-[11px] font-medium text-white/75 hover:bg-white/[0.08]"
              >
                Focus mode window
              </button>
              <button
                type="button"
                onClick={() => void closeFloatingWindow()}
                className="mt-2 w-full rounded-lg border border-white/10 py-2 text-[11px] text-white/45 hover:text-white/70"
              >
                Close floating
              </button>
            </GlassPanel>
          ) : null}

          <GlassPanel variant="subtle" className="mt-auto p-3">
            <p className="text-[10px] font-medium text-white/40">Browser build</p>
            <p className="mt-2 text-[11px] leading-snug text-white/45">
              Run <span className="font-mono text-white/55">npm run tauri:dev</span>{" "}
              for native windows + always-on-top overlay.
            </p>
          </GlassPanel>

          <button
            type="button"
            onClick={() => setCircleOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-[12px] font-medium text-white/70 transition hover:bg-white/[0.07] hover:text-white"
          >
            Your Circle
            <span className="text-white/35">⌁</span>
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
      </div>

      <AnimatePresence>
        {circleOpen ? (
          <CircleDrawer onClose={() => setCircleOpen(false)} />
        ) : null}
      </AnimatePresence>

      {!isTauri() ? (
        <p className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 text-center text-[10px] text-white/35">
          Preview · {userFirstName}
        </p>
      ) : null}
    </div>
  );
}
