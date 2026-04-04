"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { useSessionCompletionWatcher } from "@/hooks/useSessionCompletionWatcher";
import {
  loadDesktopStore,
  saveDesktopStore,
  type CompletedSessionRecord,
  type DesktopPersisted,
} from "@/lib/desktopStore";
import { buildCompletedRecordFromFeed } from "@/lib/sessionStats";
import type { Task } from "@/types/domain";

type DesktopDataContextValue = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  completedSessions: CompletedSessionRecord[];
  taskContextNote: string;
  setTaskContextNote: (note: string) => void;
};

const DesktopDataContext = createContext<DesktopDataContextValue | null>(null);

export function DesktopDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DesktopPersisted>(() => loadDesktopStore());
  const feed = useChromeBridgeFeed();
  const tasksRef = useRef(data.tasks);
  tasksRef.current = data.tasks;

  useEffect(() => {
    saveDesktopStore(data);
  }, [data]);

  const appendCompleted = useCallback((rec: CompletedSessionRecord) => {
    setData((d) => {
      if (d.completedSessions.some((s) => s.id === rec.id)) return d;
      return {
        ...d,
        completedSessions: [rec, ...d.completedSessions].slice(0, 250),
      };
    });
  }, []);

  useSessionCompletionWatcher(feed, (snap) => {
    const tasksDone = tasksRef.current.filter((t) => t.done).length;
    const rec = buildCompletedRecordFromFeed(snap, tasksDone);
    if (rec) appendCompleted(rec);
  });

  const value = useMemo<DesktopDataContextValue>(
    () => ({
      tasks: data.tasks,
      setTasks: (fn) =>
        setData((d) => ({
          ...d,
          tasks: typeof fn === "function" ? fn(d.tasks) : fn,
        })),
      completedSessions: data.completedSessions,
      taskContextNote: data.taskContextNote ?? "",
      setTaskContextNote: (note) =>
        setData((d) => ({
          ...d,
          taskContextNote: note.slice(0, 8000),
        })),
    }),
    [data.tasks, data.completedSessions, data.taskContextNote],
  );

  return (
    <DesktopDataContext.Provider value={value}>
      {children}
    </DesktopDataContext.Provider>
  );
}

export function useDesktopData(): DesktopDataContextValue {
  const v = useContext(DesktopDataContext);
  if (!v) {
    throw new Error("useDesktopData must be used within DesktopDataProvider");
  }
  return v;
}
