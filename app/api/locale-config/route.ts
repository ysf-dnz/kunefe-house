import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";

/** Edge middleware'in Prisma'ya dokunmadan dil ayarını okuyabilmesi için hafif uç. */
export async function GET() {
  const s = await getSiteSettings().catch(() => null);
  // DB hatasında varsayılanları 10 dk boyunca CDN'e ve isolate cache'ine
  // sabitlememek için cache'lenmeyen bir hata dön; middleware fail-open çalışır.
  if (!s) {
    return NextResponse.json({ error: "settings_unavailable" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
  const enabled = s?.enabledLocales?.length ? s.enabledLocales : ["tr", "en", "ar"];
  const defaultLocale = s?.defaultLocale && enabled.includes(s.defaultLocale) ? s.defaultLocale : (enabled.includes("tr") ? "tr" : enabled[0]);
  return NextResponse.json({ enabled, defaultLocale }, {
    headers: { "cache-control": "public, max-age=60, s-maxage=600, stale-while-revalidate=86400" },
  });
}
