/** Compact task estimate, e.g. 60 → "1h", 90 → "1h 30m". */
export function formatEstimateShort(min: number): string {
  const m = Math.max(1, Math.round(min));
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (r === 0) return `${h}h`;
    return `${h}h ${r}m`;
  }
  return `${m}m`;
}

/** e.g. 94 → "1h 34m", 45 → "45m" */
export function formatWorkedToday(totalMin: number): string {
  const n = Math.max(0, Math.round(totalMin));
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
