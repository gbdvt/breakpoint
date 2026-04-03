import type { ParsedChromeFeed } from "@/types/chromeFeed";
import { sessionIsLive } from "@/lib/liveSessionDetail";

type Props = {
  feed: ParsedChromeFeed | null;
};

export default function ChromeBridgeStatus({ feed }: Props) {
  if (!feed) {
    return (
      <p className="text-[11px] leading-relaxed text-white/40">
        Loading Chrome link…
      </p>
    );
  }

  if (feed.updatedAtMs === 0) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5">
        <p className="text-[11px] font-medium text-amber-100/90">
          Waiting for the Chrome extension
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-100/65">
          Keep this app open, reload the Breakpoint extension in Chrome, then
          use <span className="font-medium text-amber-100/85">Start session</span>{" "}
          above (no browser dashboard needed). Chrome still runs the extension
          that tracks tabs; this app talks to it on{" "}
          <span className="font-mono">17871</span>.
        </p>
      </div>
    );
  }

  if (sessionIsLive(feed.session)) {
    return (
      <p className="text-[11px] text-emerald-200/85">
        <span className="font-semibold">● Live</span> — session syncing from
        Chrome · {feed.events.length} captured event
        {feed.events.length === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <p className="text-[11px] text-white/45">
      Linked to Chrome · last update{" "}
      {new Date(feed.updatedAtMs).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })}
      . Use <span className="text-white/55">Start session</span> above to
      record browsing again.
    </p>
  );
}
