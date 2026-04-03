import { DUMMY_ACTIVITY, DUMMY_CIRCLE } from "@/lib/dummyData";

function avatarFor(userId: string) {
  const u = DUMMY_CIRCLE.find((c) => c.id === userId);
  const hue = u?.avatarHue ?? 200;
  return (
    <div
      className="size-6 shrink-0 rounded-full ring-1 ring-white/10"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 42%), hsl(${hue}, 50%, 24%))`,
      }}
    />
  );
}

export default function ActivityFeed() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
        Activity
      </p>
      <ul className="space-y-2.5">
        {DUMMY_ACTIVITY.map((a) => (
          <li key={a.id} className="flex gap-2.5">
            {avatarFor(a.userId)}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-snug text-white/75">{a.text}</p>
              <p className="mt-0.5 text-[10px] text-white/35">{a.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
