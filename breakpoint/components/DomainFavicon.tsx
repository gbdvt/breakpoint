"use client";

import { useState } from "react";

type Props = {
  domain?: string;
  size?: number;
  className?: string;
};

function isLocalDevHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "127.0.0.1" ||
    h.endsWith(".local")
  );
}

/**
 * Site icon via Google’s favicon service (no extension required).
 * Localhost / missing host → neutral “app” glyph.
 */
export default function DomainFavicon({
  domain,
  size = 22,
  className = "",
}: Props) {
  const [broken, setBroken] = useState(false);
  const raw = domain?.replace(/^www\./i, "").trim().toLowerCase() ?? "";

  if (!raw || isLocalDevHost(raw) || broken) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-neutral-200 text-[10px] font-bold text-neutral-600 ${className}`}
        style={{ width: size, height: size }}
        title={domain || "Unknown"}
        aria-hidden
      >
        {raw && isLocalDevHost(raw) ? "⌂" : "·"}
      </span>
    );
  }

  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(raw)}&sz=64`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon URL
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-md bg-white object-contain ring-1 ring-neutral-200/80 ${className}`}
      loading="lazy"
      title={raw}
      onError={() => setBroken(true)}
    />
  );
}
