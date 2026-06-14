export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

const LIVE_THRESHOLD_MS = 5 * 60 * 1000;

export function isCourierLive(
  lastSeenAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
  thresholdMs: number = LIVE_THRESHOLD_MS
): boolean {
  if (!lastSeenAt) return false;
  const t = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= thresholdMs;
}
