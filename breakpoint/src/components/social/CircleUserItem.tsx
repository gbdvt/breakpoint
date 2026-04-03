import type { CircleUser } from "@/src/lib/dummyData";

type Props = {
  user: CircleUser;
};

const statusDot: Record<CircleUser["status"], string> = {
  online: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
  in_session: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.45)]",
  away: "bg-white/25",
};

const statusLabel: Record<CircleUser["status"], string> = {
  online: "Online",
  in_session: "In session",
  away: "Away",
};

export default function CircleUserItem({ user }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]">
      <div className="relative">
        <div
          className="flex size-9 items-center justify-center rounded-full text-[11px] font-semibold text-white/90 ring-1 ring-white/10"
          style={{
            background: `linear-gradient(135deg, hsl(${user.avatarHue}, 42%, 38%), hsl(${user.avatarHue}, 52%, 22%))`,
          }}
        >
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[#0c1224] ${statusDot[user.status]}`}
          title={statusLabel[user.status]}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/90">
          {user.name}
        </p>
        <p className="truncate text-[11px] text-white/45">{user.lastLine}</p>
      </div>
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-white/35">
        {statusLabel[user.status]}
      </span>
    </div>
  );
}
