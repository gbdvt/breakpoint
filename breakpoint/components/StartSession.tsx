"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearEvents, clearSession, saveSession } from "@/lib/storage";
import type {
  AiTaskEstimate,
  FocusSession,
  SessionMode,
} from "@/types/session";
import { getExtensionId, sendExtensionMessage } from "@/lib/extensionBridge";
import ExtensionHint from "@/components/ExtensionHint";
import { getUserProfile, profileForPrompt } from "@/lib/userProfile";

const MODES: SessionMode[] = ["lecture", "coding", "writing", "research"];

export default function StartSession() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<SessionMode>("lecture");
  const [durationMin, setDurationMin] = useState(45);
  const [pending, setPending] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [aiEstimate, setAiEstimate] = useState<AiTaskEstimate | null>(null);
  /** Goal text at the time of the last successful estimate (avoid stale attach). */
  const [estimateGoalSnap, setEstimateGoalSnap] = useState<string | null>(null);

  async function fetchEstimate() {
    if (!goal.trim()) return;
    setEstimateError(null);
    setEstimateLoading(true);
    try {
      const res = await fetch("/api/ai/estimate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
          mode,
          plannedDurationMin: durationMin,
          profile: profileForPrompt(getUserProfile()),
        }),
      });
      const data = (await res.json()) as {
        minutesMin?: number;
        minutesMax?: number;
        oneLiner?: string;
        error?: string;
      };
      if (!res.ok) {
        setEstimateError(data.error ?? "Estimate failed");
        setAiEstimate(null);
        setEstimateGoalSnap(null);
        return;
      }
      if (
        typeof data.minutesMin !== "number" ||
        typeof data.minutesMax !== "number" ||
        typeof data.oneLiner !== "string"
      ) {
        setEstimateError("Unexpected response");
        return;
      }
      setAiEstimate({
        minutesMin: data.minutesMin,
        minutesMax: data.minutesMax,
        oneLiner: data.oneLiner,
        estimatedAt: Date.now(),
      });
      setEstimateGoalSnap(goal.trim());
    } catch {
      setEstimateError("Network error");
      setAiEstimate(null);
      setEstimateGoalSnap(null);
    } finally {
      setEstimateLoading(false);
    }
  }

  function applyMidpointToPlan() {
    if (!aiEstimate) return;
    const mid = Math.round(
      (aiEstimate.minutesMin + aiEstimate.minutesMax) / 2,
    );
    setDurationMin(Math.min(480, Math.max(5, mid)));
  }

  async function handleStart() {
    if (!goal.trim()) return;

    const session: FocusSession = {
      id: crypto.randomUUID(),
      goal: goal.trim(),
      mode,
      durationMin,
      startedAt: Date.now(),
      ...(aiEstimate && estimateGoalSnap === goal.trim()
        ? { aiEstimate }
        : {}),
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
    <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
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
        className="mb-3 w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none focus:border-neutral-500"
      />

      <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <p className="mb-2 text-sm font-medium text-violet-950">
          AI time estimate (optional, ~1 cheap call)
        </p>
        <p className="mb-3 text-xs text-violet-900/80">
          Uses your task text, mode, planned block, and local rolling stats from
          past sessions (length, peak drift, planned time). Re-run if you edit the
          task. Set{" "}
          <code className="rounded bg-white/80 px-1">ANTHROPIC_API_KEY</code> in{" "}
          <code className="rounded bg-white/80 px-1">.env.local</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={estimateLoading || !goal.trim()}
            onClick={() => void fetchEstimate()}
            className="rounded-lg bg-violet-900 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
          >
            {estimateLoading ? "Estimating…" : "Estimate time"}
          </button>
          {aiEstimate ? (
            <button
              type="button"
              onClick={applyMidpointToPlan}
              className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-950 hover:bg-violet-50"
            >
              Use midpoint for plan
            </button>
          ) : null}
        </div>
        {estimateError ? (
          <p className="mt-2 text-sm text-red-800" role="alert">
            {estimateError}
          </p>
        ) : null}
        {aiEstimate ? (
          <p className="mt-3 text-sm text-violet-950">
            <span className="font-semibold">
              ~{aiEstimate.minutesMin}–{aiEstimate.minutesMax} min
            </span>{" "}
            focused work · {aiEstimate.oneLiner}
          </p>
        ) : null}
      </div>

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
