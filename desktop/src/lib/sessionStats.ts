import { mapChromeEventsToTimeline } from "@/lib/mapChromeEventsToTimeline";
import { distractionCount } from "@/lib/liveSessionDetail";
import { formatWorkedToday } from "@/lib/formatDuration";
import type { CompletedSessionRecord } from "@/lib/desktopStore";
import type {
  HomeSessionSummary,
  SessionDetail,
  WorkSessionListItem,
} from "@/types/domain";
import type { ParsedChromeFeed } from "@/types/chromeFeed";
import { sessionIsLive } from "@/lib/liveSessionDetail";

export function formatSessionTimeRange(startedAt: number, endedAt: number): string {
  const o: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Date(startedAt).toLocaleTimeString(undefined, o)} – ${new Date(endedAt).toLocaleTimeString(undefined, o)}`;
}

export function formatSessionListSubtitle(endedAt: number): string {
  const d = new Date(endedAt);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const t = d.getTime();
  if (t >= startOfToday.getTime()) {
    return `Today · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (t >= startOfYesterday.getTime()) {
    return `Yesterday · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function completedToHomeSummary(s: CompletedSessionRecord): HomeSessionSummary {
  return {
    id: s.id,
    label: s.goal,
    durationLabel: formatWorkedToday(s.durationMin),
    timeRange: formatSessionTimeRange(s.startedAt, s.endedAt),
    workLabel: `${s.durationMin} min tracked`,
    focusMin: s.durationMin,
    distractions: s.distractions,
    taskCount: s.tasksCompleted,
  };
}

export function completedToWorkSessionListItem(
  s: CompletedSessionRecord,
): WorkSessionListItem {
  const driftPenalty = Math.min(40, s.distractions * 4);
  return {
    id: s.id,
    title: s.goal,
    startedAt: formatSessionListSubtitle(s.endedAt),
    durationMin: s.durationMin,
    distractions: s.distractions,
    focusScore: Math.max(38, Math.min(98, Math.round(92 - driftPenalty))),
  };
}

export function completedToSessionDetail(s: CompletedSessionRecord): SessionDetail {
  const start = new Date(s.startedAt);
  const end = new Date(s.endedAt);
  const dateLabel = `${start.toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
  return {
    id: s.id,
    name: s.goal,
    dateLabel,
    durationMin: s.durationMin,
    tasksCompleted: s.tasksCompleted,
    distractions: s.distractions,
    milestones: [],
    queueCostMin: 0,
    timeline: mapChromeEventsToTimeline(s.events),
  };
}

export function workedTodayMinutes(
  sessions: CompletedSessionRecord[],
  feed: ParsedChromeFeed | null,
): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const t0 = startOfDay.getTime();
  let m = 0;
  for (const s of sessions) {
    if (s.endedAt < t0) continue;
    const segStart = Math.max(s.startedAt, t0);
    const segEnd = s.endedAt;
    if (segEnd > segStart) {
      m += (segEnd - segStart) / 60_000;
    }
  }
  if (feed?.session && sessionIsLive(feed.session)) {
    const st = feed.session.startedAt;
    m += Math.max(0, (Date.now() - Math.max(st, t0)) / 60_000);
  }
  return Math.floor(m);
}

export type StatsBundle = {
  chartWeek: { day: string; hours: number; distractions: number }[];
  hoursWorked: number;
  distractions: number;
  tasksDone: number;
  sessions: number;
  timeDistractedMin: number;
  avgDistractedPerSession: number;
  focusScore: number;
  personalBests: { label: string; value: string; when: string }[];
};

function dayKey(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function buildStatsBundle(sessions: CompletedSessionRecord[]): StatsBundle {
  const now = new Date();
  const chartWeek: StatsBundle["chartWeek"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const t0 = d.getTime();
    const t1 = t0 + 86_400_000;
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const daySessions = sessions.filter(
      (s) => s.endedAt >= t0 && s.endedAt < t1,
    );
    const hours =
      Math.round(
        daySessions.reduce((a, s) => a + s.durationMin / 60, 0) * 10,
      ) / 10;
    const distractions = daySessions.reduce((a, s) => a + s.distractions, 0);
    chartWeek.push({ day: label, hours, distractions });
  }

  const totalMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  const totalDistractions = sessions.reduce((a, s) => a + s.distractions, 0);
  const tasksDone = sessions.reduce((a, s) => a + s.tasksCompleted, 0);
  const n = sessions.length;
  const avgDistractedPerSession =
    n > 0 ? Math.round((totalDistractions / n) * 10) / 10 : 0;
  const focusScore =
    n > 0
      ? Math.max(
          42,
          Math.min(
            96,
            Math.round(88 - avgDistractedPerSession * 3.2 - (totalDistractions / n) * 0.5),
          ),
        )
      : 0;

  const personalBests = buildPersonalBests(sessions, now);

  return {
    chartWeek,
    hoursWorked: Math.round((totalMin / 60) * 10) / 10,
    distractions: totalDistractions,
    tasksDone,
    sessions: n,
    timeDistractedMin: 0,
    avgDistractedPerSession,
    focusScore,
    personalBests,
  };
}

function buildPersonalBests(
  sessions: CompletedSessionRecord[],
  now: Date,
): { label: string; value: string; when: string }[] {
  if (sessions.length === 0) return [];

  const longest = sessions.reduce((a, s) =>
    s.durationMin > a.durationMin ? s : a,
  );
  const byDay = new Map<
    string,
    { distractions: number; tasks: number; sessions: CompletedSessionRecord[] }
  >();
  for (const s of sessions) {
    const k = dayKey(s.endedAt);
    const cur = byDay.get(k) ?? {
      distractions: 0,
      tasks: 0,
      sessions: [],
    };
    cur.distractions += s.distractions;
    cur.tasks += s.tasksCompleted;
    cur.sessions.push(s);
    byDay.set(k, cur);
  }

  let lowestDay: { k: string; d: number } | null = null;
  for (const [k, v] of byDay) {
    if (v.sessions.length === 0) continue;
    if (lowestDay === null || v.distractions < lowestDay.d) {
      lowestDay = { k, d: v.distractions };
    }
  }

  let bestTasksDay: { k: string; t: number } | null = null;
  for (const [k, v] of byDay) {
    if (bestTasksDay === null || v.tasks > bestTasksDay.t) {
      bestTasksDay = { k, t: v.tasks };
    }
  }

  const fmtWhen = (isoDay: string) =>
    new Date(`${isoDay}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const out: { label: string; value: string; when: string }[] = [
    {
      label: "Longest session",
      value: formatWorkedToday(longest.durationMin),
      when: new Date(longest.endedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    },
  ];

  if (lowestDay && byDay.size > 1) {
    out.push({
      label: "Calmest day (drifts)",
      value: `${lowestDay.d} total`,
      when: fmtWhen(lowestDay.k),
    });
  }

  if (bestTasksDay && bestTasksDay.t > 0) {
    out.push({
      label: "Most tasks in a day",
      value: String(bestTasksDay.t),
      when: fmtWhen(bestTasksDay.k),
    });
  }

  return out.slice(0, 4);
}

export function buildCompletedRecordFromFeed(
  feed: ParsedChromeFeed,
  tasksCompleted: number,
): CompletedSessionRecord | null {
  const s = feed.session;
  if (!s?.endedAt) return null;
  return {
    id: s.id,
    goal: s.goal,
    mode: s.mode,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMin: Math.max(
      1,
      Math.round((s.endedAt - s.startedAt) / 60_000),
    ),
    distractions: distractionCount(feed.events),
    tasksCompleted,
    events: feed.events,
  };
}
