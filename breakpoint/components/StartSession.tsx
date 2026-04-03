"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearEvents, clearSession, saveSession } from "@/lib/storage";
import type { FocusSession, SessionMode } from "@/types/session";
import { getExtensionId, sendExtensionMessage } from "@/lib/extensionBridge";
import ExtensionHint from "@/components/ExtensionHint";

const MODES: SessionMode[] = ["lecture", "coding", "writing", "research"];

export default function StartSession() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<SessionMode>("lecture");
  const [durationMin, setDurationMin] = useState(45);
  const [pending, setPending] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    if (!goal.trim()) return;

    const session: FocusSession = {
      id: crypto.randomUUID(),
      goal: goal.trim(),
      mode,
      durationMin,
      startedAt: Date.now(),
    };

    setStartError(null);

    if (!getExtensionId()) {
      setStartError(
        "Set NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID in .env.local (see extension README), then restart npm run dev.",
      );
      return;
    }

    setPending(true);
    try {
      clearEvents();
      saveSession(session);

      const ack = await sendExtensionMessage({
        type: "SESSION_START",
        session,
      });

      if (!ack || ack.ok !== true) {
        clearSession();
        setStartError(
          !ack
            ? "Extension did not respond. Use Chrome, load the unpacked extension, and confirm this origin is listed under externally_connectable in its manifest."
            : `Could not start tracking (${"error" in ack ? ack.error : "unknown"}).`,
        );
        return;
      }

      router.push("/session");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p className="mb-1 text-sm font-medium text-amber-700">Breakpoint</p>
      <h1 className="mb-2 text-3xl font-semibold text-neutral-900">
        Start a session
      </h1>
      <p className="mb-6 text-sm text-neutral-600">
        Sessions are tracked by the Breakpoint Chrome extension: tab switches,
        new tabs, navigations, and repeat visits to distractor sites. Data stays
        local in the browser.
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

      {startError && (
        <p
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {startError}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => void handleStart()}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start session"}
      </button>

      <ExtensionHint />
    </div>
  );
}
