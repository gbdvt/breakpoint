/** Realistic placeholder data for premium UI previews. */

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

export const DUMMY_TASKS: Task[] = [
  {
    id: "1",
    title: "Ship drift overlay copy + timing",
    done: false,
    project: "Breakpoint",
    estimateMin: 45,
  },
  {
    id: "2",
    title: "Review API route error shapes",
    done: true,
    project: "Breakpoint",
    estimateMin: 20,
  },
  {
    id: "3",
    title: "Draft hackathon demo script",
    done: false,
    project: "Demo",
    estimateMin: 60,
  },
  {
    id: "4",
    title: "Inbox zero — engineering",
    done: false,
    estimateMin: 25,
  },
];

export const DUMMY_SESSIONS: WorkSessionListItem[] = [
  {
    id: "demo-1",
    title: "Deep work — extension polish",
    startedAt: "Today · 9:12",
    durationMin: 94,
    distractions: 3,
    focusScore: 86,
  },
  {
    id: "s2",
    title: "Dashboard redesign pass",
    startedAt: "Yesterday · 14:05",
    durationMin: 52,
    distractions: 7,
    focusScore: 71,
  },
  {
    id: "s3",
    title: "Literature notes — ch. 4",
    startedAt: "Mon · 19:40",
    durationMin: 38,
    distractions: 1,
    focusScore: 92,
  },
];

export const DUMMY_PROJECTS: Project[] = [
  { id: "p1", name: "Breakpoint", taskCount: 12, sessionsThisWeek: 8 },
  { id: "p2", name: "Thesis", taskCount: 6, sessionsThisWeek: 3 },
  { id: "p3", name: "Side experiments", taskCount: 4, sessionsThisWeek: 1 },
];

export const DUMMY_CIRCLE: CircleUser[] = [
  {
    id: "u1",
    name: "Maya Chen",
    avatarHue: 210,
    status: "in_session",
    lastLine: "Focus · Design systems",
  },
  {
    id: "u2",
    name: "Jordan Lee",
    avatarHue: 165,
    status: "online",
    lastLine: "Available",
  },
  {
    id: "u3",
    name: "Alex Rivera",
    avatarHue: 32,
    status: "away",
    lastLine: "Back at 6",
  },
];

export const DUMMY_ACTIVITY: ActivityItem[] = [
  {
    id: "a1",
    userId: "u1",
    text: "Ended a 52m session · 2 drifts",
    time: "12m ago",
  },
  {
    id: "a2",
    userId: "u2",
    text: "Started “API hardening”",
    time: "34m ago",
  },
  {
    id: "a3",
    userId: "u1",
    text: "Hit weekly focus goal",
    time: "2h ago",
  },
];

export const DUMMY_SESSION_DETAIL: SessionDetail = {
  id: "demo-1",
  name: "Deep work — extension polish",
  dateLabel: "Friday, Apr 3 · 9:12 – 10:46",
  durationMin: 94,
  tasksCompleted: 2,
  distractions: 3,
  milestones: [
    "25m uninterrupted block",
    "Returned after first drift in 2m",
    "Closed queue estimate under plan",
  ],
  queueCostMin: 18,
  timeline: [
    {
      id: "t1",
      time: "9:12",
      label: "Session start",
      detail: "Goal: overlay + debrief insights",
      tone: "neutral",
    },
    {
      id: "t2",
      time: "9:28",
      label: "Focus block",
      detail: "28m on localhost + docs",
      tone: "focus",
    },
    {
      id: "t3",
      time: "9:56",
      label: "Drift",
      detail: "youtube.com · tutorial tab",
      tone: "drift",
    },
    {
      id: "t4",
      time: "9:58",
      label: "Recovery",
      detail: "Back to task · intervention dismissed",
      tone: "milestone",
    },
    {
      id: "t5",
      time: "10:30",
      label: "Milestone",
      detail: "UI components compile clean",
      tone: "milestone",
    },
    {
      id: "t6",
      time: "10:46",
      label: "Session end",
      detail: "Drift load settled · debrief saved",
      tone: "neutral",
    },
  ],
};

export const CHART_WEEK = [
  { day: "Mon", hours: 4.2, distractions: 6 },
  { day: "Tue", hours: 5.1, distractions: 4 },
  { day: "Wed", hours: 3.4, distractions: 9 },
  { day: "Thu", hours: 6.0, distractions: 3 },
  { day: "Fri", hours: 4.8, distractions: 5 },
  { day: "Sat", hours: 1.5, distractions: 2 },
  { day: "Sun", hours: 2.0, distractions: 1 },
];

export const STATS_METRICS = {
  hoursWorked: 26.4,
  distractions: 34,
  tasksDone: 18,
  sessions: 22,
  timeDistractedMin: 142,
  avgDistractedPerSession: 4.2,
  focusScore: 78,
};

export const PERSONAL_BESTS = [
  { label: "Longest focus streak", value: "2h 14m", when: "Mar 18" },
  { label: "Lowest drift day", value: "1 tap", when: "Mar 22" },
  { label: "Most tasks / day", value: "9", when: "Mar 15" },
];
