import type { BreakpointEvent } from "@/types/event";
import {
  isDistractorHost,
  isResearchHintHost,
  normalizeHost,
} from "@/lib/driftEngine";

const CAP_MINUTES = 180;
/** Per-video ceiling for queue minutes (honest workload, not full watch time). */
const VIDEO_MAX_MINUTES = 120;

function youtubeHost(domain: string, url: string): boolean {
  const d = domain ? normalizeHost(domain) : "";
  if (d.includes("youtube") || d.endsWith(".youtube.com")) return true;
  try {
    const h = normalizeHost(new URL(url).hostname);
    return h === "youtu.be" || h.endsWith(".youtu.be");
  } catch {
    return false;
  }
}

function isYoutubeQueueNavigationUrl(url: string): boolean {
  return (
    url.includes("youtube.com/watch") ||
    url.includes("youtube.com/shorts/") ||
    /youtu\.be\//i.test(url)
  );
}

function minutesFromVideoDurationSec(sec: number | undefined): number | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(Math.max(1, Math.ceil(sec / 60)), VIDEO_MAX_MINUTES);
}

function formatDurationLabel(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * Rough “hidden workload” from opened sources (honest heuristic, not watch time).
 * YouTube / video hosts weighted higher than docs; real video length used when present.
 */
export function estimateResearchQueueMinutes(events: BreakpointEvent[]): {
  totalMinutes: number;
  items: string[];
} {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let total = 0;
  const items: string[] = [];

  for (const e of sorted) {
    const d = e.domain ? normalizeHost(e.domain) : "";
    const url = e.url ?? "";
    if (!d && !url) continue;

    if (e.type === "TAB_CREATE") {
      if (youtubeHost(e.domain ?? "", url)) {
        const fromVid = minutesFromVideoDurationSec(e.videoDurationSec);
        if (fromVid != null) {
          total += fromVid;
          items.push(
            `+${fromVid} min · YouTube (~${formatDurationLabel(e.videoDurationSec!)} video)`,
          );
        } else {
          total += 7;
          items.push("+7 min · new YouTube tab (typical clip assumption)");
        }
      } else if (isDistractorHost(e.domain)) {
        total += 5;
        items.push(`+5 min · new tab · ${d}`);
      } else if (isResearchHintHost(e.domain)) {
        total += 4;
        items.push(`+4 min · new research tab · ${d}`);
      }
    }

    if (e.type === "NAVIGATION" && isYoutubeQueueNavigationUrl(url)) {
      const fromVid = minutesFromVideoDurationSec(e.videoDurationSec);
      if (fromVid != null) {
        total += fromVid;
        items.push(
          `+${fromVid} min · YouTube watch (~${formatDurationLabel(e.videoDurationSec!)})`,
        );
      } else {
        total += 6;
        items.push("+6 min · YouTube watch page navigation");
      }
    } else if (e.type === "NAVIGATION" && isResearchHintHost(e.domain)) {
      total += 3;
      items.push(`+3 min · doc navigation · ${d}`);
    }
  }

  const capped = Math.min(Math.round(total), CAP_MINUTES);
  return { totalMinutes: capped, items: items.slice(-12) };
}
