import type { Task } from "@/lib/dummyData";

type Props = {
  task: Task;
  /** Queue-style drag handle + optional active highlight */
  queue?: boolean;
  active?: boolean;
};

export default function TaskItem({ task, queue, active }: Props) {
  return (
    <div
      className={`group flex items-start gap-2.5 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04] ${
        active
          ? "bg-indigo-500/20 ring-1 ring-indigo-400/35"
          : ""
      }`}
    >
      {queue ? (
        <div
          className="mt-1 flex w-4 shrink-0 flex-col gap-0.5 text-white/25"
          aria-hidden
        >
          <span className="h-px w-3 rounded-full bg-current" />
          <span className="h-px w-3 rounded-full bg-current" />
        </div>
      ) : null}
      {queue && active ? (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          title="Current focus"
        />
      ) : null}
      <button
        type="button"
        aria-pressed={task.done}
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-md border transition ${
          task.done
            ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
            : "border-white/15 bg-white/[0.03] text-transparent hover:border-white/25"
        }`}
      >
        {task.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[13px] leading-snug ${
            task.done ? "text-white/40 line-through" : "text-white/88"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-white/38">
          {task.project ? (
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5">
              {task.project}
            </span>
          ) : null}
          {task.estimateMin != null ? (
            <span className="font-mono tabular-nums">~{task.estimateMin}m</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
