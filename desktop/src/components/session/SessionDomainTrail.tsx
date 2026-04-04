"use client";

import SectionHeader from "@/components/ui/SectionHeader";

type Props = {
  domains: string[];
};

function faviconUrl(domain: string): string {
  const d = domain.replace(/^www\./i, "").trim();
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=48`;
}

export default function SessionDomainTrail({ domains }: Props) {
  return (
    <div className="glass-card p-5">
      <SectionHeader
        title="Sites"
        subtitle="Where you went during this session"
      />
      {domains.length === 0 ? (
        <p className="mt-1 text-[12px] text-white/40">
          No domains recorded for this session.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-3">
          {domains.map((d, i) => (
            <span key={`${d}-${i}`} className="flex items-center gap-1">
              {i > 0 ? (
                <span className="px-1 text-[11px] text-white/20" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                title={d}
              >
                <img
                  src={faviconUrl(d)}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 shrink-0 rounded-md bg-white/[0.06] object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span className="max-w-[120px] truncate text-[11px] font-medium text-white/78">
                  {d}
                </span>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
