import type { BreakpointEvent } from "@/types/event";

const MAX_LINES = 45;
const TITLE_MAX = 48;

/** Tight newline-separated digest for LLM (minimal tokens). */
export function buildEventDigest(events: BreakpointEvent[]): string {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const tail = sorted.slice(-MAX_LINES);
  const lines = tail.map((e) => {
    const t = (e.title ?? "").slice(0, TITLE_MAX).replace(/\s+/g, " ");
    const d = e.domain ?? "?";
    return `${e.type} ${d} ${t}`.trim();
  });
  return lines.join("\n");
}
