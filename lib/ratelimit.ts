import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash yapılandırılmamışsa (lokal dev / env yoksa) rate-limit DEVRE DIŞI kalır (fail-open).
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

type Window = `${number} s` | `${number} m` | `${number} h`;

function make(tokens: number, window: Window): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: "kh-rl",
    analytics: false,
  });
}

const limiters = {
  login: make(5, "5 m"),
  order: make(5, "1 m"),
  application: make(3, "1 m"),
  courierPing: make(40, "1 m"),
};

export type LimitName = keyof typeof limiters;

/**
 * İzin varsa true, limit aşıldıysa false döner.
 * Fail-open: Upstash yoksa veya Redis hatası olursa true (akış engellenmez).
 */
export async function checkRateLimit(name: LimitName, identifier: string): Promise<boolean> {
  const limiter = limiters[name];
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(`${name}:${identifier}`);
    return success;
  } catch {
    return true;
  }
}

/** İstek başlıklarından istemci IP'sini çıkarır (Vercel: x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}
