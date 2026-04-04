"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { connectExtensionPort, getExtensionId } from "@/lib/extensionBridge";
import type { BreakpointEvent } from "@/types/event";

/**
 * While a focus session is active and the extension id is configured, keeps
 * tab/attention events in sync via the dashboard port (STATE pushes).
 */
export function useExtensionSessionFeed(
  tracking: boolean,
  setEvents: Dispatch<SetStateAction<BreakpointEvent[]>>,
): void {
  useEffect(() => {
    if (!tracking || !getExtensionId()) return;
    const teardown = connectExtensionPort((_session, events) => {
      setEvents(events);
    });
    return teardown ?? undefined;
  }, [tracking, setEvents]);
}
