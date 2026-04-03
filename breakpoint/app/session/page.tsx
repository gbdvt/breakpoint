"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionHeader from "@/components/SessionHeader";
import { liveBehaviorLabel } from "@/lib/debriefInsights";
import { computeDriftIndex } from "@/lib/driftEngine";
import { getExtensionId, sendExtensionMessage } from "@/lib/extensionBridge";
import { useExtensionSessionFeed } from "@/hooks/useExtensionSessionFeed";
import { getEvents, getSession, saveEvents, saveSession } from "@/lib/storage";
import { recordSessionComplete } from "@/lib/userProfile";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

export default function SessionPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [events, setEvents] = useState<BreakpointEvent[]>([]);
  const [ending, setEnding] = useState(false);

  const tracking =
    !!session && !session.endedAt && !!getExtensionId();

  useExtensionSessionFeed(tracking, setEvents);

  useEffect(() => {
    setSession(getSession());
    setEvents(getEvents());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveEvents(events);
  }, [events, hydrated]);

  async function endSessionForDebrief() {
    setEnding(true);
    try {
      await sendExtensionMessage({ type: "SESSION_END" });
      const state = await sendExtensionMessage({ type: "GET_STATE" });
      if (state?.ok) {
        if (state.session) {
          saveSession(state.session);
          setSession(state.session);
        }
        if (state.events) saveEvents(state.events);
        const sess = state.session as FocusSession | undefined;
        const evs =
          (state.events as BreakpointEvent[] | undefined) ?? getEvents();
        if (sess?.endedAt) {
          recordSessionComplete(sess, evs);
        }
      }
    } finally {
      setEnding(false);
    }
    router.push("/debrief");
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <p className="text-center text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-neutral-600">No active session.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Start from home
          </button>
        </div>
      </main>
    );
  }

  const driftIndex = computeDriftIndex(events);
  const behaviorHint = liveBehaviorLabel(events);

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <SessionHeader session={session} />
        <p className="mb-4 text-sm leading-relaxed text-neutral-600">
          Breakpoint catches when overload turns into avoidance. When drift is
          high, the extension shows a small in-tab card only — nothing modal here.
        </p>

        {getExtensionId() ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Live: extension is recording tab activity for this session.
          </p>
        ) : (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Extension ID missing — add NEXT_PUBLIC_BREAKPOINT_EXTENSION_ID to
            .env.local.
          </p>
        )}

        <div className="mb-6 rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-600">Drift load (rolling)</p>
          <p className="text-3xl font-bold text-neutral-900">{driftIndex}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Rule-based score from recent events; not a medical measure.
          </p>
          {behaviorHint ? (
            <p className="mt-2 text-sm font-medium text-amber-900/90">
              {behaviorHint}
            </p>
          ) : null}
        </div>

        <div className="mb-6">
          <button
            type="button"
            disabled={ending}
            onClick={() => void endSessionForDebrief()}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
          >
            {ending ? "Saving…" : "End session → debrief"}
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Event feed
          </h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {events.length === 0 && (
              <p className="text-sm text-neutral-500">
                No events yet. Switch tabs, open new ones, or navigate — the
                extension will append rows here. Titles often fill in after the
                page loads (e.g. YouTube, ChatGPT).
              </p>
            )}
            {events.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm"
              >
                <div className="font-medium text-neutral-900">{event.type}</div>
                <div className="text-neutral-600">
                  {event.domain ?? "—"} · {event.title ?? "untitled"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
