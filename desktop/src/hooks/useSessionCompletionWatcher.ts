import { useEffect, useRef } from "react";
import type { ParsedChromeFeed } from "@/types/chromeFeed";

/**
 * When a session flips from live → ended (same id), persist once.
 * Skips cold loads where the first snapshot is already ended.
 */
export function useSessionCompletionWatcher(
  feed: ParsedChromeFeed | null,
  onCompleted: (feed: ParsedChromeFeed) => void,
): void {
  const prevRef = useRef<ParsedChromeFeed | null>(null);
  const cbRef = useRef(onCompleted);
  cbRef.current = onCompleted;

  useEffect(() => {
    const prev = prevRef.current;
    if (feed) prevRef.current = feed;

    if (!feed?.session?.endedAt) return;
    if (!prev?.session) return;
    if (prev.session.id !== feed.session.id) return;
    if (prev.session.endedAt) return;

    cbRef.current(feed);
  }, [feed]);
}
