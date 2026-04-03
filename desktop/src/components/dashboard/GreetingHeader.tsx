"use client";

import { useMemo } from "react";

type Props = {
  name: string;
};

function partOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

export default function GreetingHeader({ name }: Props) {
  const pod = useMemo(() => partOfDay(), []);
  const greet =
    pod === "morning"
      ? "Good morning"
      : pod === "afternoon"
        ? "Good afternoon"
        : pod === "evening"
          ? "Good evening"
          : "Hey";

  return (
    <header className="mb-8">
      <p className="text-[12px] font-medium text-indigo-300/70">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
        {greet}, {name}
      </h1>
      <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-white/50">
        Breakpoint is watching for overload → avoidance. Start a session when
        you&apos;re ready to protect deep work.
      </p>
    </header>
  );
}
