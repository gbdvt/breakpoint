export type SessionMode = "lecture" | "coding" | "writing" | "research";

/** One cheap Claude call at session start; optional. */
export type AiTaskEstimate = {
  minutesMin: number;
  minutesMax: number;
  oneLiner: string;
  estimatedAt: number;
};

export type FocusSession = {
  id: string;
  goal: string;
  mode: SessionMode;
  durationMin: number;
  startedAt: number;
  endedAt?: number;
  aiEstimate?: AiTaskEstimate;
};
