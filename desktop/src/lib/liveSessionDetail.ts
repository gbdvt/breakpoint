import { mapChromeEventsToTimeline } from "@/lib/mapChromeEventsToTimeline";
import type { SessionDetail } from "@/lib/dummyData";
import type { ParsedChromeFeed } from "@/types/chromeFeed";

export function sessionIsLive(s: ParsedChromeFeed["session"]): boolean {
  return !!(s && !s.endedAt);
}

export function distractionCount(events: ParsedChromeFeed["events"]): number {
  return events.filter(
    (e) => e.type === "DISTRACTOR_OPEN" || e.type === "REPEAT_CHECK",
  ).length;
}

export function buildLiveSessionDetail(feed: ParsedChromeFeed): SessionDetail | null {
  if (!feed.session) return null;
  const now = Date.now();
  const elapsedMin = Math.max(
    1,
    Math.round((now - feed.session.startedAt) / 60_000),
  );
  const d = distractionCount(feed.events);
  return {
    id: "live",
    name: feed.session.goal,
    dateLabel: `${new Date(feed.session.startedAt).toLocaleString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })} · in progress`,
    durationMin: elapsedMin,
    tasksCompleted: 0,
    distractions: d,
    milestones:
      d === 0
        ? ["No drift signals recorded yet in this session."]
        : [`${d} drift-related signal${d === 1 ? "" : "s"} from Chrome.`],
    queueCostMin: 0,
    timeline: mapChromeEventsToTimeline(feed.events),
  };
}
