import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Slightly stronger glass for hero sections */
  variant?: "default" | "elevated" | "subtle";
  as?: "div" | "section" | "article";
};

const variants = {
  default:
    "border-white/[0.09] bg-white/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.35)]",
  elevated:
    "border-white/[0.12] bg-white/[0.08] shadow-[0_12px_48px_rgba(0,0,0,0.45)]",
  subtle:
    "border-white/[0.06] bg-white/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
};

export default function GlassPanel({
  children,
  className = "",
  variant = "default",
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={`rounded-[22px] border backdrop-blur-2xl ${variants[variant]} ${className}`}
    >
      {children}
    </Tag>
  );
}
