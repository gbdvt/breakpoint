import type { Task } from "@/types/domain";
import type { ChromeBreakpointEvent } from "@/types/chromeFeed";

const STORAGE_KEY = "breakpoint.desktop.v1";

export const STORE_CHANGED_EVENT = "breakpoint-desktop-store-changed";

export type CompletedSessionRecord = {
  id: string;
  goal: string;
  mode: string;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  distractions: number;
  tasksCompleted: number;
  /** Titles of tasks marked done when this session completed (trimmed, capped). */
  completedTaskTitles?: string[];
  events: ChromeBreakpointEvent[];
};

export type DesktopPersisted = {
  tasks: Task[];
  completedSessions: CompletedSessionRecord[];
  /** Free-form notes for task time estimation (study habits, sites, lecture lengths, etc.). */
  taskContextNote: string;
};

export function defaultDesktopPersisted(): DesktopPersisted {
  return { tasks: [], completedSessions: [], taskContextNote: "" };
}

function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.title !== "string" ||
    typeof o.done !== "boolean"
  ) {
    return null;
  }
  const t: Task = {
    id: o.id,
    title: o.title,
    done: o.done,
  };
  if (typeof o.estimateMin === "number") t.estimateMin = o.estimateMin;
  if (o.estimating === true) t.estimating = true;
  return t;
}

export function loadDesktopStore(): DesktopPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDesktopPersisted();
    const p = JSON.parse(raw) as Partial<DesktopPersisted>;
    const rawTasks = Array.isArray(p.tasks) ? p.tasks : [];
    return {
      tasks: rawTasks
        .map(sanitizeTask)
        .filter((t): t is Task => t != null),
      completedSessions: Array.isArray(p.completedSessions)
        ? p.completedSessions
        : [],
      taskContextNote:
        typeof p.taskContextNote === "string"
          ? p.taskContextNote.slice(0, 8000)
          : "",
    };
  } catch {
    return defaultDesktopPersisted();
  }
}

export function saveDesktopStore(data: DesktopPersisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(STORE_CHANGED_EVENT));
  } catch {
    /* quota / private mode */
  }
}
