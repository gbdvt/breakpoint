import type { WorkSessionListItem } from "@/src/lib/dummyData";
import Link from "next/link";

type Props = {
  session: WorkSessionListItem;
};

export default function WorkSessionItem({ session }: Props) {
  return (
    <Link
      href={`/session/${session.id}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.05]"
    >
      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] font-mono text-[10px] leading-tight text-white/70">
        <span className="text-white/90">{session.durationMin}</span>
        <span className="text-[8px] uppercase text-white/35">min</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/88">
          {session.title}
        </p>
        <p className="text-[11px] text-white/40">{session.startedAt}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[10px] font-medium text-rose-300/80">
          {session.distractions} drift{session.distractions === 1 ? "" : "s"}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-emerald-300/75">
          {session.focusScore}% focus
        </span>
      </div>
    </Link>
  );
}
