"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

const MotionLink = motion.create(Link);

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M15 6.5L9.5 12 15 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  to: string;
  "aria-label": string;
  className?: string;
};

export default function NavBackButton({
  to,
  "aria-label": ariaLabel,
  className,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <MotionLink
      to={to}
      aria-label={ariaLabel}
      initial={reduce ? false : { opacity: 0, x: -6 }}
      animate={reduce ? undefined : { opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.75,
      }}
      whileTap={
        reduce
          ? undefined
          : {
              scale: 0.88,
              transition: { type: "spring", stiffness: 600, damping: 35 },
            }
      }
      whileHover={
        reduce
          ? undefined
          : {
              scale: 1.05,
              transition: { type: "spring", stiffness: 400, damping: 22 },
            }
      }
      className={[
        "relative flex size-9 shrink-0 items-center justify-center rounded-full",
        "border border-white/[0.09] bg-white/[0.045] text-white/50",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md",
        "outline-none transition-[color,background-color,border-color] duration-200 ease-out",
        "hover:border-white/[0.13] hover:bg-white/[0.085] hover:text-white/90",
        "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className ?? "",
      ].join(" ")}
    >
      <ChevronLeft className="size-5 -translate-x-px" />
    </MotionLink>
  );
}
