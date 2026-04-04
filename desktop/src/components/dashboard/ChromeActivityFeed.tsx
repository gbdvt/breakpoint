import GlassPanel from "@/components/ui/GlassPanel";
import SectionHeader from "@/components/ui/SectionHeader";
import TranscriptOutlineCollapsible from "@/components/dashboard/TranscriptOutlineCollapsible";
import type { ChromeBreakpointEvent } from "@/types/chromeFeed";

type Props = {
  events: ChromeBreakpointEvent[];
  maxItems?: number;
};

function typeLabel(t: ChromeBreakpointEvent["type"]): string {
  switch (t) {
    case "NAVIGATION":
      return "Visit";
    case "TAB_SWITCH":
      return "Focus";
    case "TAB_CREATE":
      return "New tab";
    case "DISTRACTOR_OPEN":
      return "Distractor";
    case "REPEAT_CHECK":
      return "Repeat";
    default:
      return t;
  }
}

function formatAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function formatVideoLength(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function ChromeActivityFeed({ events, maxItems = 18 }: Props) {
  const slice = [...events].slice(-maxItems).reverse();

  return (
    <GlassPanel className="p-3">
      <SectionHeader
        title="Chrome activity"
        subtitle="Sites and tabs from your extension session"
      />
      {slice.length === 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          No events yet. Start a focus session from the web app (with the
          Breakpoint extension) and browse — entries appear here in real time.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-white/[0.06]">
          {slice.map((e, i) => (
            <li
              key={`${e.timestamp}-${e.tabId ?? "x"}-${i}`}
              className="flex gap-2 py-2.5"
            >
              <span className="w-16 shrink-0 font-mono text-[10px] tabular-nums text-white/35">
                {formatAgo(e.timestamp)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-white/85">
                  <span className="text-indigo-200/90">
                    {e.domain ?? "—"}
                  </span>
                  {e.title ? (
                    <span className="font-normal text-white/50">
                      {" "}
                      ·{" "}
                      {e.title.length > 72
                        ? `${e.title.slice(0, 72)}…`
                        : e.title}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  {typeLabel(e.type)}
                  {e.videoDurationSec != null &&
                  Number.isFinite(e.videoDurationSec) ? (
                    <span className="text-white/45">
                      {" "}
                      · video {formatVideoLength(e.videoDurationSec)}
                    </span>
                  ) : null}
                </p>
                <TranscriptOutlineCollapsible event={e} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
