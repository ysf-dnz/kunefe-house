export function minutesBetween(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined
): number | null {
  if (!from || !to) return null;
  const a = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const b = to instanceof Date ? to.getTime() : new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const min = Math.round((b - a) / 60000);
  return min < 0 ? null : min;
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}
