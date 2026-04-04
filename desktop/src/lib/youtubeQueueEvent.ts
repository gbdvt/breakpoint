import type { ChromeBreakpointEvent } from "@/types/chromeFeed";

/** Matches extension queue + transcript triggers (TAB_CREATE / NAVIGATION on YouTube watch). */
export function isYoutubeQueueChromeEvent(e: ChromeBreakpointEvent): boolean {
  const url = e.url ?? "";
  const d = (e.domain ?? "").toLowerCase();
  if (e.type === "NAVIGATION") {
    return (
      url.includes("youtube.com/watch") ||
      url.includes("youtube.com/shorts/") ||
      /youtu\.be\//i.test(url)
    );
  }
  if (e.type === "TAB_CREATE") {
    return (
      d.includes("youtube") ||
      d.endsWith("youtube.com") ||
      /youtu\.be/i.test(url)
    );
  }
  return false;
}
