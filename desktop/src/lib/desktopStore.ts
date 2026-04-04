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
  events: ChromeBreakpointEvent[];
};

export type DesktopPersisted = {
  tasks: Task[];
  completedSessions: CompletedSessionRecord[];
};

export function defaultDesktopPersisted(): DesktopPersisted {
  return { tasks: [], completedSessions: [] };
}

export function loadDesktopStore(): DesktopPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDesktopPersisted();
    const p = JSON.parse(raw) as Partial<DesktopPersisted>;
    return {
      tasks: Array.isArray(p.tasks) ? p.tasks : [],
      completedSessions: Array.isArray(p.completedSessions)
        ? p.completedSessions
        : [],
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
