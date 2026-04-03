"use client";

import { useEffect, useRef } from "react";
import {
  connectExtensionPort,
  getExtensionId,
  sendExtensionMessage,
} from "@/lib/extensionBridge";
import { saveEvents } from "@/lib/storage";
import type { BreakpointEvent } from "@/types/event";

export function useExtensionSessionFeed(
  active: boolean,
  setEvents: React.Dispatch<React.SetStateAction<BreakpointEvent[]>>,
) {
  const setEventsRef = useRef(setEvents);
  setEventsRef.current = setEvents;

  useEffect(() => {
    if (!active || !getExtensionId()) return;

    let disconnect: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const snap = await sendExtensionMessage({ type: "GET_STATE" });
      if (snap?.ok && Array.isArray(snap.events)) {
        setEventsRef.current(snap.events);
        saveEvents(snap.events);
      }

      disconnect = connectExtensionPort((_session, events) => {
        setEventsRef.current(events);
        saveEvents(events);
      });

      if (!disconnect) {
        poll = setInterval(async () => {
          const r = await sendExtensionMessage({ type: "GET_STATE" });
          if (r?.ok && Array.isArray(r.events)) {
            setEventsRef.current(r.events);
            saveEvents(r.events);
          }
        }, 1500);
      }
    })();

    return () => {
      disconnect?.();
      if (poll) clearInterval(poll);
    };
  }, [active]);
}
