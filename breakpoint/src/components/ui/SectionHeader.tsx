import type { ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
  subtitle?: string;
};

export default function SectionHeader({ title, action, subtitle }: Props) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[13px] font-semibold tracking-wide text-white/90">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-white/45">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
