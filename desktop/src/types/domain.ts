/** Shared desktop UI domain types (no mock payloads). */

export type Task = {
  id: string;
  title: string;
  done: boolean;
  project?: string;
  estimateMin?: number;
};

export type WorkSessionListItem = {
  id: string;
  title: string;
  startedAt: string;
  durationMin: number;
  distractions: number;
  focusScore: number;
};

export type Project = {
  id: string;
  name: string;
  taskCount: number;
  sessionsThisWeek: number;
};

export type CircleUser = {
  id: string;
  name: string;
  avatarHue: number;
  status: "online" | "in_session" | "away";
  lastLine?: string;
};

export type ActivityItem = {
  id: string;
  userId: string;
  text: string;
  time: string;
};

export type TimelineEvent = {
  id: string;
  time: string;
  label: string;
  detail: string;
  tone: "focus" | "drift" | "milestone" | "neutral";
};

export type SessionDetail = {
  id: string;
  name: string;
  dateLabel: string;
  durationMin: number;
  tasksCompleted: number;
  distractions: number;
  milestones: string[];
  queueCostMin: number;
  timeline: TimelineEvent[];
};

export type HomeSessionSummary = {
  id: string;
  label: string;
  durationLabel: string;
  timeRange: string;
  workLabel: string;
  focusMin: number;
  distractions: number;
  taskCount: number;
};
