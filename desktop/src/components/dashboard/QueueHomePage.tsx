"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link, useOutletContext } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesktopData } from "@/context/DesktopDataContext";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { useVoiceTranscript } from "@/hooks/useVoiceTranscript";
import type { HomeOutletContext } from "@/lib/homeOutlet";
import { formatEstimateShort, formatWorkedToday } from "@/lib/formatDuration";
import { completedToHomeSummary, workedTodayMinutes } from "@/lib/sessionStats";
import type { Task } from "@/types/domain";
import { sessionIsLive } from "@/lib/liveSessionDetail";
import { isTauri, queueSessionStart } from "@/lib/tauriBridge";

type LocalTask = Task & { estimating?: boolean };

function greetingLabel(firstName: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${firstName}`;
  if (h < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 017.5 9h9a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  );
}

function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.723 7.723 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default function QueueHomePage() {
  const { openFriends, openSettings } = useOutletContext<HomeOutletContext>();
  const { tasks, setTasks, completedSessions } = useDesktopData();
  const feed = useChromeBridgeFeed();
  const live = feed && sessionIsLive(feed.session);

  const firstName = "Gaspar";
  const [tasksOpen, setTasksOpen] = useState(true);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [workTick, setWorkTick] = useState(0);
  const { listen, listening } = useVoiceTranscript();

  useEffect(() => {
    const id = window.setInterval(() => setWorkTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const tasksLeft = tasks.filter((t) => !t.done).length;
  const tasksLeftLabel =
    tasksLeft === 1 ? "1 task left" : `${tasksLeft} tasks left`;

  const workedTodayMin = useMemo(() => {
    void workTick;
    return workedTodayMinutes(completedSessions, feed);
  }, [completedSessions, feed, workTick]);

  const addTask = useCallback(() => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    const id = crypto.randomUUID();
    setTasks((prev: LocalTask[]) => [
      ...prev,
      {
        id,
        title,
        done: false,
        estimating: true,
        project: "No project",
      },
    ]);
    const est = 20 + Math.floor(Math.random() * 35);
    window.setTimeout(() => {
      setTasks((prev: LocalTask[]) =>
        prev.map((t) =>
          t.id === id ? { ...t, estimating: false, estimateMin: est } : t,
        ),
      );
    }, 1600);
  }, [draft, setTasks]);

  const toggleDone = (id: string) => {
    setTasks((prev: LocalTask[]) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const startSession = async () => {
    if (!isTauri()) return;
    setStartError(null);
    const next = tasks.find((t) => !t.done);
    const goal = next?.title?.trim() || "Focus session";
    const durationMin = next?.estimateMin ?? 45;
    setStarting(true);
    try {
      await queueSessionStart({
        id: crypto.randomUUID(),
        goal,
        mode: "coding",
        durationMin,
        startedAt: Date.now(),
      });
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Couldn’t start");
    } finally {
      setStarting(false);
    }
  };

  const chevron = (open: boolean) => (
    <span
      className={`inline-block text-[8px] text-white/35 transition-transform duration-200 ${open ? "-rotate-180" : ""}`}
      aria-hidden
    >
      ▼
    </span>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
        <div
          {...(isTauri() ? { "data-tauri-drag-region": true } : {})}
        >
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[21px] font-semibold leading-tight tracking-tight text-white">
              {greetingLabel(firstName)}
            </h1>
            <div className="no-drag flex shrink-0 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={openFriends}
                className="flex size-9 items-center justify-center rounded-xl border border-cyan-100/[0.08] bg-white/[0.04] text-white/55 transition hover:border-cyan-100/[0.12] hover:bg-white/[0.07] hover:text-white/85"
                aria-label="Friends"
              >
                <FriendsIcon className="size-[18px]" />
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="flex size-9 items-center justify-center rounded-xl border border-cyan-100/[0.08] bg-white/[0.04] text-white/55 transition hover:border-cyan-100/[0.12] hover:bg-white/[0.07] hover:text-white/85"
                aria-label="Settings"
              >
                <SettingsIcon className="size-[18px]" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[13px] font-medium text-white/42">
            {tasksLeftLabel} · {formatWorkedToday(workedTodayMin)} worked today
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-3 text-left"
            onClick={() => setTasksOpen((v) => !v)}
          >
            {chevron(tasksOpen)}
            <span className="text-[14px] font-semibold text-white">Tasks</span>
          </button>
          {tasksOpen ? (
            <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">
              <ul className="mb-3 space-y-2">
                <AnimatePresence initial={false}>
                  {tasks.map((t) => (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDone(t.id)}
                          className={`mt-0.5 size-[18px] shrink-0 rounded-md border-2 transition ${
                            t.done
                              ? "border-emerald-400/55 bg-emerald-500/25"
                              : "border-white/25 bg-transparent hover:border-white/35"
                          }`}
                          aria-label={t.done ? "Undo" : "Done"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-[13px] font-medium leading-snug ${
                                t.done
                                  ? "text-white/35 line-through"
                                  : "text-white/[0.92]"
                              }`}
                            >
                              {t.title}
                            </p>
                            {!t.estimating && t.estimateMin ? (
                              <span className="shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums tracking-tight text-sky-200/75">
                                {formatEstimateShort(t.estimateMin)}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-sky-400/12 px-2 py-0.5 text-[10px] font-medium text-sky-100/80">
                              {t.project ?? "No project"}
                            </span>
                          </div>
                          {t.estimating ? (
                            <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-sky-400/80 to-indigo-400/70"
                                initial={{ width: "12%" }}
                                animate={{ width: ["12%", "88%", "40%", "70%"] }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                  }}
                  placeholder="Add a task…"
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-[13px] text-white placeholder:text-white/28 focus:border-cyan-200/25 focus:outline-none focus:ring-1 focus:ring-cyan-200/15"
                />
                <button
                  type="button"
                  onClick={() =>
                    listen((t) => setDraft((d) => (d ? `${d} ${t}` : t)))
                  }
                  disabled={listening}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.1] disabled:opacity-40"
                  aria-label="Voice"
                >
                  {listening ? (
                    <span className="text-[11px]">…</span>
                  ) : (
                    <svg
                      className="size-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={addTask}
                  className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.08] px-3 py-2.5 text-[12px] font-semibold text-white/90 transition hover:bg-white/[0.12]"
                >
                  Add
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-0.5 pr-1.5">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left"
              onClick={() => setSessionsOpen((v) => !v)}
            >
              {chevron(sessionsOpen)}
              <span className="text-[14px] font-semibold text-white">
                Work sessions
              </span>
            </button>
            <Link
              to="/stats"
              className="no-drag flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
              aria-label="Analytics"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </Link>
            <Link
              to="/sessions"
              className="no-drag flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
              aria-label="All sessions"
            >
              <CalendarIcon className="size-4" />
            </Link>
            <button
              type="button"
              onClick={openSettings}
              className="no-drag flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
              aria-label="Settings"
            >
              <SettingsIcon className="size-4" />
            </button>
          </div>
          {sessionsOpen ? (
            <ul className="space-y-2 border-t border-white/[0.06] px-3 py-3">
              {completedSessions.length === 0 ? (
                <li className="px-1 py-2 text-center text-[12px] text-white/38">
                  No completed sessions yet. End a work session to see it
                  here.
                </li>
              ) : (
                completedSessions.slice(0, 12).map((rec) => {
                  const s = completedToHomeSummary(rec);
                  return (
                    <li key={s.id} className="list-none">
                      <Link
                        to={`/session/${rec.id}`}
                        className="glass-card block px-3 py-3 transition hover:bg-white/[0.03]"
                      >
                        <p className="text-[11px] font-medium tabular-nums text-white/38">
                          {s.timeRange}
                        </p>
                        <p className="mt-1 text-[14px] font-semibold text-white/[0.94]">
                          {s.label}
                        </p>
                        <p className="mt-2 text-[12px] text-white/48">
                          <span className="tabular-nums">{s.durationLabel}</span>
                          <span className="mx-1.5 text-white/18">·</span>
                          <span>{s.taskCount} tasks</span>
                          <span className="mx-1.5 text-white/18">·</span>
                          <span className="font-medium text-rose-300/[0.92]">
                            {s.distractions} distractions
                          </span>
                        </p>
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      </div>

      {!live ? (
        <div className="shrink-0 border-t border-white/[0.06] bg-transparent px-4 pb-4 pt-3">
          <button
            type="button"
            disabled={starting || !isTauri()}
            onClick={() => void startSession()}
            className="w-full rounded-full border border-indigo-200/15 bg-gradient-to-r from-indigo-500/[0.38] via-violet-500/[0.28] to-indigo-600/[0.35] py-3.5 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(79,70,229,0.2)] transition hover:from-indigo-500/[0.45] disabled:opacity-40"
          >
            {starting ? "…" : "Start Session"}
          </button>
          {startError ? (
            <p className="mt-2 text-center text-[11px] text-rose-300/90">
              {startError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
