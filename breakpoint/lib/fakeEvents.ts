import type { BreakpointEvent } from "@/types/event";

export function simulateYoutubeDrift(): BreakpointEvent[] {
  const t = Date.now();
  return [
    {
      timestamp: t,
      type: "TAB_SWITCH",
      domain: "docs.google.com",
      title: "Lecture Notes",
      url: "https://docs.google.com",
    },
    {
      timestamp: t + 400,
      type: "TAB_SWITCH",
      domain: "calendar.google.com",
      title: "Calendar",
      url: "https://calendar.google.com",
    },
    {
      timestamp: t + 900,
      type: "TAB_SWITCH",
      domain: "youtube.com",
      title: "YouTube",
      url: "https://youtube.com",
    },
    {
      timestamp: t + 1400,
      type: "DISTRACTOR_OPEN",
      domain: "youtube.com",
      title: "YouTube",
      url: "https://youtube.com",
    },
  ];
}

export function simulateResearchSpiral(): BreakpointEvent[] {
  const t = Date.now();
  return [
    {
      timestamp: t,
      type: "TAB_CREATE",
      domain: "stackoverflow.com",
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
    },
    {
      timestamp: t + 1000,
      type: "TAB_CREATE",
      domain: "youtube.com",
      title: "OpenClaw Tutorial",
      url: "https://youtube.com/watch?v=1",
    },
    {
      timestamp: t + 2000,
      type: "TAB_CREATE",
      domain: "youtube.com",
      title: "Another Tutorial",
      url: "https://youtube.com/watch?v=2",
    },
    {
      timestamp: t + 3000,
      type: "TAB_CREATE",
      domain: "reddit.com",
      title: "Discussion Thread",
      url: "https://reddit.com",
    },
  ];
}
