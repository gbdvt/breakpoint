"use client";

import { useCallback, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import { useChromeBridgeFeed } from "@/hooks/useChromeBridgeFeed";
import { sessionIsLive } from "@/lib/liveSessionDetail";
import {
  isTauri,
  queueSessionEnd,
  queueSessionStart,
  queueClearExtensionState,
} from "@/lib/tauriBridge";
import type { SessionMode } from "@/types/chromeFeed";

const MODES: SessionMode[] = ["lecture", "coding", "writing", "research"];

export default function DesktopSessionPanel() {
  const feed = useChromeBridgeFeed();
  const live = !!(feed && sessionIsLive(feed.session));

  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<SessionMode>("coding");
  const [durationMin, setDurationMin] = useState(45);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!goal.trim()) {
      setError("Add a goal first.");
      return;
    }
    if (!isTauri()) {
      setError("Run the Breakpoint desktop app to start sessions here.");
      return;
    }
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const d = Math.min(480, Math.max(5, Math.round(durationMin)));
      await queueSessionStart({
        id: crypto.randomUUID(),
        goal: goal.trim(),
        mode,
        durationMin: d,
        startedAt: Date.now(),
      });
      setNotice(
        "Sent to the Chrome extension — tracking should begin in about a second. Keep Chrome running with Breakpoint enabled.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }, [goal, mode, durationMin]);

  const end = useCallback(async () => {
    if (!isTauri()) return;
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      await queueSessionEnd();
      setNotice("End session sent — extension will stop tracking shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!isTauri()) return;
    if (!window.confirm("Clear extension session and all captured events?")) return;
    setPending(true);
    try {
      await queueClearExtensionState();
      setNotice("Clear sent to extension.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }, []);

  if (!isTauri()) {
    return (
      <GlassPanel className="p-3">
        <SectionHeader
          title="Focus session"
          subtitle="Desktop app only"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
          Start and stop sessions from the native Breakpoint app (
          <span className="font-mono text-white/55">npm run tauri:dev</span>
          ). This panel is hidden in web-only builds.
        </p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="p-3">
      <SectionHeader
        title="Focus session"
        subtitle="Runs in Chrome via extension — no browser dashboard needed"
      />

      {live && feed?.session ? (
        <div className="mt-3 space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3">
          <p className="text-[11px] font-medium text-emerald-100/95">
            Session active
          </p>
          <p className="text-[12px] leading-snug text-white/85">
            {feed.session.goal}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void end()}
              className="rounded-full bg-rose-500/25 px-3 py-1.5 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/35 disabled:opacity-50"
            >
              End session
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void clearAll()}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-medium text-white/50 hover:bg-white/[0.06] disabled:opacity-50"
            >
              Clear all data
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Goal
            </span>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              placeholder="What are you doing in this block?"
              className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[12px] text-white/90 placeholder:text-white/30 focus:border-indigo-400/40 focus:outline-none"
            />
          </label>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Mode
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition ${
                    mode === m
                      ? "bg-white/[0.16] text-white"
                      : "text-white/45 hover:bg-white/[0.06] hover:text-white/75"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
              Planned minutes
            </span>
            <input
              type="number"
              min={5}
              max={480}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 45)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[12px] text-white/90 focus:border-indigo-400/40 focus:outline-none"
            />
          </label>

          <button
            type="button"
            disabled={pending}
            onClick={() => void start()}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600/90 to-violet-600/85 py-3 text-[13px] font-semibold text-white shadow-lg shadow-indigo-900/30 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Start session"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-2 text-[11px] text-rose-300/90">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-2 text-[11px] leading-relaxed text-indigo-200/85">
          {notice}
        </p>
      ) : null}
    </GlassPanel>
  );
}
