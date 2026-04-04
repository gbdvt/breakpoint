"use client";

import type { ReactNode } from "react";
import { isTauri } from "@/lib/tauriBridge";

type Props = {
  children?: ReactNode;
  className?: string;
};

/** Tauri: drag handle strip; optional left control (e.g. back) stays clickable. */
export default function PageTopDragRow({ children, className }: Props) {
  const tauri = isTauri();
  return (
    <div
      className={`mb-4 flex min-h-9 items-center gap-2 ${className ?? ""}`}
      {...(tauri ? { "data-tauri-drag-region": true } : {})}
    >
      {children ? (
        <div className="no-drag flex shrink-0 items-center">{children}</div>
      ) : null}
      <div className="min-h-9 min-w-0 flex-1" aria-hidden />
    </div>
  );
}
