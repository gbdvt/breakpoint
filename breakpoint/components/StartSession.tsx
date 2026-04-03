"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearEvents, saveSession } from "@/lib/storage";
import type { FocusSession, SessionMode } from "@/types/session";

const MODES: SessionMode[] = ["lecture", "coding", "writing", "research"];

export default function StartSession() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<SessionMode>("lecture");
  const [durationMin, setDurationMin] = useState(45);

  function handleStart() {
    if (!goal.trim()) return;

    const session: FocusSession = {
      id: crypto.randomUUID(),
      goal: goal.trim(),
      mode,
      durationMin,
      startedAt: Date.now(),
    };

    clearEvents();
    saveSession(session);
    router.push("/session");
  }

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="mb-1 text-sm font-medium text-amber-700">Breakpoint</p>
      <h1 className="mb-2 text-3xl font-semibold text-neutral-900">
        Start a session
      </h1>
      <p className="mb-6 text-sm text-neutral-600">
        Set a goal and mode. We&apos;ll watch for drift patterns (demo uses
        simulated browser events until the extension ships).
      </p>

      <label className="mb-2 block text-sm font-medium text-neutral-700">
        What are you trying to do?
      </label>
      <input
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Finish lecture notes, ship the fix, write the doc…"
        className="mb-6 w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none focus:border-neutral-500"
      />

      <label className="mb-2 block text-sm font-medium text-neutral-700">
        Mode
      </label>
      <div className="mb-6 flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMode(item)}
            className={`rounded-full px-4 py-2 text-sm capitalize transition ${
              mode === item
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm font-medium text-neutral-700">
        Planned duration (minutes)
      </label>
      <input
        type="number"
        min={1}
        max={480}
        value={durationMin}
        onChange={(e) => setDurationMin(Number(e.target.value))}
        className="mb-6 w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none focus:border-neutral-500"
      />

      <button
        type="button"
        onClick={handleStart}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 font-medium text-white transition hover:bg-neutral-800"
      >
        Start session
      </button>
    </div>
  );
}
