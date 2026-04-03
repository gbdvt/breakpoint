"use client";

import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import CircleDrawer from "@/src/components/social/CircleDrawer";
import FloatingSessionBar from "@/src/components/session/FloatingSessionBar";
import GlassPanel from "@/src/components/ui/GlassPanel";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Home", icon: "◆" },
  { href: "/stats", label: "Stats", icon: "◇" },
  { href: "/session/demo-1", label: "Session", icon: "○" },
];

type Props = {
  children: ReactNode;
  /** Show demo floating bar (dashboard preview) */
  showFloatingBar?: boolean;
  userFirstName?: string;
};

export default function AppShell({
  children,
  showFloatingBar = true,
  userFirstName = "Gaspar",
}: Props) {
  const pathname = usePathname();
  const [circleOpen, setCircleOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden font-[family-name:var(--font-plus-jakarta)]"
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[#060a14]" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-[#0c1430] to-[#050818]" />
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -right-20 bottom-40 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full bg-violet-900/20 blur-[90px]" />
      </div>

      <div className="flex min-h-screen">
        {/* Left rail */}
        <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] px-4 py-6">
          <Link href="/" className="mb-10 flex items-center gap-2.5 px-1">
            <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white/90 backdrop-blur-md">
              B
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-tight text-white">
                Breakpoint
              </p>
              <p className="text-[10px] text-white/40">Focus OS</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
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

          <GlassPanel variant="subtle" className="mt-auto p-3">
            <p className="text-[10px] font-medium text-white/40">Live tracking</p>
            <Link
              href="/focus/start"
              className="mt-2 block text-[12px] font-medium text-indigo-200/90 hover:text-white"
            >
              Start real session →
            </Link>
            <Link
              href="/session"
              className="mt-1 block text-[11px] text-white/45 hover:text-white/70"
            >
              Extension dashboard
            </Link>
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

        {/* Main */}
        <main className="min-w-0 flex-1 px-8 py-7 pb-32">{children}</main>
      </div>

      <AnimatePresence>
        {circleOpen ? (
          <CircleDrawer onClose={() => setCircleOpen(false)} />
        ) : null}
      </AnimatePresence>

      {showFloatingBar ? <FloatingSessionBar userFirstName={userFirstName} /> : null}
    </div>
  );
}
