"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DebriefCard from "@/components/DebriefCard";
import { sendExtensionMessage } from "@/lib/extensionBridge";
import {
  clearEvents,
  clearSession,
  getEvents,
  getSession,
  saveEvents,
  saveSession,
} from "@/lib/storage";
import type { BreakpointEvent } from "@/types/event";
import type { FocusSession } from "@/types/session";

export default function DebriefPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [events, setEvents] = useState<BreakpointEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const localSession = getSession();
      const localEvents = getEvents();
      const remote = await sendExtensionMessage({ type: "GET_STATE" });

      if (cancelled) return;

      if (remote?.ok && remote.session) {
        setSession(remote.session as FocusSession);
        const ev = Array.isArray(remote.events)
          ? (remote.events as BreakpointEvent[])
          : localEvents;
        setEvents(ev);
        saveSession(remote.session as FocusSession);
        saveEvents(ev);
      } else {
        setSession(localSession);
        setEvents(localEvents);
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
          <p className="mb-4 text-neutral-600">No session to debrief.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Go home
          </button>
        </div>
      </main>
    );
  }

  async function handleFinish() {
    await sendExtensionMessage({ type: "CLEAR_ALL" });
    clearEvents();
    clearSession();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <DebriefCard session={session} events={events} />
      <div className="mx-auto mt-6 max-w-3xl">
        <button
          type="button"
          onClick={() => void handleFinish()}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Finish and clear data
        </button>
      </div>
    </main>
  );
}
