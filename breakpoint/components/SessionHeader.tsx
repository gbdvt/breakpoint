"use client";

import { useEffect, useState } from "react";
import type { FocusSession } from "@/types/session";

type Props = {
  session: FocusSession;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionHeader({ session }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = now - session.startedAt;

  return (
    <header className="mb-6 border-b border-neutral-100 pb-6">
      <p className="mb-1 text-sm text-neutral-500">Active session</p>
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">
        {session.goal}
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
        <span className="capitalize">{session.mode}</span>
        <span aria-hidden>·</span>
        <span>Plan {session.durationMin} min</span>
        <span aria-hidden>·</span>
        <span className="font-mono text-neutral-800">
          Elapsed {formatElapsed(elapsed)}
        </span>
      </div>
    </header>
  );
}
