import type { SessionDetail } from "@/types/domain";

type Props = {
  detail: Pick<SessionDetail, "name" | "dateLabel">;
};

/** Compact title row — sits above the drift chart. */
export default function SessionDetailHeader({ detail }: Props) {
  return (
    <div className="glass-card px-4 py-3.5">
      <h1 className="text-[17px] font-semibold leading-snug tracking-tight text-white/[0.94]">
        {detail.name}
      </h1>
      <p className="mt-1 text-[12px] font-medium text-white/42">
        {detail.dateLabel}
      </p>
    </div>
  );
}
