import type { ChromeBreakpointEvent } from "@/types/chromeFeed";
import { isYoutubeQueueChromeEvent } from "@/lib/youtubeQueueEvent";

type Props = {
  event: ChromeBreakpointEvent;
};

function summaryLabel(e: ChromeBreakpointEvent): string {
  const st = e.transcriptStatus;
  if (st === "loading") return "Video outline · fetching…";
  if (st === "ready" && e.transcriptBullets?.length)
    return `Video outline · ${e.transcriptBullets.length} points`;
  if (st === "unavailable") return "Video outline · no captions";
  if (st === "error") return "Video outline · couldn’t generate";
  return "Video outline";
}

export default function TranscriptOutlineCollapsible({ event: e }: Props) {
  if (!isYoutubeQueueChromeEvent(e)) return null;

  const bullets = e.transcriptBullets;

  return (
    <details className="group mt-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-left">
      <summary className="cursor-pointer select-none text-[10px] font-medium text-violet-200/85 outline-none hover:text-violet-100/90 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          <span
            className="text-white/40 transition-transform group-open:rotate-90"
            aria-hidden
          >
            ▸
          </span>
          {summaryLabel(e)}
        </span>
      </summary>
      <div className="mt-2 border-t border-white/[0.06] pt-2">
        {e.transcriptStatus === "loading" ? (
          <p className="text-[10px] leading-relaxed text-white/45">
            Pulling captions and summarizing…
          </p>
        ) : null}
        {!e.transcriptStatus ? (
          <p className="text-[10px] leading-relaxed text-white/45">
            Opens five bullet points from the caption track (Next.js + Claude on
            your machine).
          </p>
        ) : null}
        {e.transcriptStatus === "ready" && bullets && bullets.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-[10px] leading-relaxed text-white/70">
            {bullets.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
        {e.transcriptStatus === "unavailable" ? (
          <p className="text-[10px] leading-relaxed text-white/45">
            No captions on this video, or captions are still loading — focus the
            tab again in a moment.
          </p>
        ) : null}
        {e.transcriptStatus === "error" && e.transcriptError ? (
          <p className="text-[10px] leading-relaxed text-amber-200/70">
            {e.transcriptError}
          </p>
        ) : null}
        {e.transcriptStatus === "error" && !e.transcriptError ? (
          <p className="text-[10px] leading-relaxed text-amber-200/70">
            Something went wrong. Is Next.js running with ANTHROPIC_API_KEY?
          </p>
        ) : null}
      </div>
    </details>
  );
}
