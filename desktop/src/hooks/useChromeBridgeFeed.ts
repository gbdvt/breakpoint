import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { parseChromeFeed } from "@/lib/parseChromeFeed";
import { isTauri } from "@/lib/tauriBridge";
import type { ChromeBridgeSnapshotRaw, ParsedChromeFeed } from "@/types/chromeFeed";

export function useChromeBridgeFeed(): ParsedChromeFeed | null {
  const [snapshot, setSnapshot] = useState<ParsedChromeFeed | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    async function load() {
      try {
        const raw = await invoke<ChromeBridgeSnapshotRaw>("get_chrome_bridge_state");
        if (!cancelled) setSnapshot(parseChromeFeed(raw));
      } catch {
        if (!cancelled) setSnapshot(null);
      }
    }

    void load();

    void listen("chrome-bridge-updated", () => {
      void load();
    }).then((fn) => {
      if (!cancelled) unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return snapshot;
}
