"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InterventionModal from "@/components/InterventionModal";
import SessionHeader from "@/components/SessionHeader";
import {
  computeDriftIndex,
  interventionKind,
  shouldIntervene,
} from "@/lib/driftEngine";
import { getExtensionId, sendExtensionMessage } from "@/lib/extensionBridge";
import { useExtensionSessionFeed } from "@/hooks/useExtensionSessionFeed";
import { getEvents, getSession, saveEvents, saveSession } from "@/lib/storage";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

export default function SessionPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [events, setEvents] = useState<BreakpointEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [modalKind, setModalKind] = useState<ReturnType<
    typeof interventionKind
  >>("reactive");
  const prevInterveneRef = useRef(false);

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
    const score = computeDriftIndex(events);
    const crossed = shouldIntervene(score) && !prevInterveneRef.current;
    if (crossed) {
      setModalKind(interventionKind(events));
      setModalOpen(true);
    }
    prevInterveneRef.current = shouldIntervene(score);
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
  const latestDomain = events[events.length - 1]?.domain;

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <SessionHeader session={session} />

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
                extension will append rows here.
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

      <InterventionModal
        open={modalOpen}
        kind={modalKind}
        goal={session.goal}
        domain={latestDomain}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}
