import type { BreakpointEvent } from "@/types/event";

/** Hostnames only; subdomains allowed (e.g. m.youtube.com). */
const DISTRACTOR_ROOTS = [
  "youtube.com",
  "linkedin.com",
  "reddit.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "tiktok.com",
];

const RESEARCH_HINT_ROOTS = [
  "stackoverflow.com",
  "github.com",
  "developer.mozilla.org",
  "mdn.io",
  "w3.org",
  "npmjs.com",
  "medium.com",
  "dev.to",
];

export function normalizeHost(domain?: string): string {
  if (!domain) return "";
  return domain.replace(/^www\./i, "").toLowerCase().trim();
}

export function isDistractorHost(domain?: string): boolean {
  const host = normalizeHost(domain);
  if (!host) return false;
  return DISTRACTOR_ROOTS.some(
    (root) => host === root || host.endsWith(`.${root}`),
  );
}

function isResearchHintHost(domain?: string): boolean {
  const host = normalizeHost(domain);
  if (!host) return false;
  return RESEARCH_HINT_ROOTS.some(
    (root) => host === root || host.endsWith(`.${root}`),
  );
}

const RECENT_WINDOW = 10;

export function computeDriftIndex(events: BreakpointEvent[]): number {
  let score = 0;
  const recent = events.slice(-RECENT_WINDOW);

  const tabSwitches = recent.filter((e) => e.type === "TAB_SWITCH").length;
  const tabCreates = recent.filter((e) => e.type === "TAB_CREATE").length;
  const distractorHits = recent.filter(
    (e) => e.domain && isDistractorHost(e.domain),
  ).length;
  const repeatChecks = recent.filter((e) => e.type === "REPEAT_CHECK").length;
  const explicitDistractor = recent.filter(
    (e) => e.type === "DISTRACTOR_OPEN",
  ).length;

  if (tabSwitches >= 3) score += 2;
  if (tabCreates >= 3) score += 2;
  if (distractorHits >= 1 || explicitDistractor >= 1) score += 3;
  if (repeatChecks >= 2) score += 2;

  return score;
}

export function shouldIntervene(score: number): boolean {
  return score >= 5;
}

/**
 * True if this batch includes landing on a distractor (focus left work for a known escape hatch).
 * Used to re-trigger intervention while already in the drift band, not only the first crossing.
 */
export function newBatchIndicatesDistractorFocus(
  items: BreakpointEvent[],
): boolean {
  for (const e of items) {
    if (e.type === "DISTRACTOR_OPEN") return true;
    if (
      e.type === "TAB_SWITCH" &&
      e.domain &&
      isDistractorHost(e.domain)
    ) {
      return true;
    }
  }
  return false;
}

export type AttentionTone = "distractor" | "research" | "neutral" | "unknown";

/** For debrief coloring: where attention sat (by domain). */
export function attentionTone(domain?: string): AttentionTone {
  if (!domain) return "unknown";
  if (isDistractorHost(domain)) return "distractor";
  if (isResearchHintHost(domain)) return "research";
  return "neutral";
}

export type InterventionKind = "reactive" | "research";

/**
 * Chooses copy tone: research inflation vs reactive drift, from recent events.
 */
export function interventionKind(events: BreakpointEvent[]): InterventionKind {
  const recent = events.slice(-RECENT_WINDOW);
  const tabCreates = recent.filter((e) => e.type === "TAB_CREATE").length;
  const researchOpens = recent.filter(
    (e) =>
      e.type === "TAB_CREATE" &&
      e.domain &&
      (isResearchHintHost(e.domain) || isDistractorHost(e.domain)),
  ).length;

  if (tabCreates >= 3 && researchOpens >= 2) return "research";
  if (tabCreates >= 4) return "research";
  return "reactive";
}
