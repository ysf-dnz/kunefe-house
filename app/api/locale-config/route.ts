import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";

/** Edge middleware'in Prisma'ya dokunmadan dil ayarını okuyabilmesi için hafif uç. */
export async function GET() {
  const s = await getSiteSettings().catch(() => null);
  const enabled = s?.enabledLocales?.length ? s.enabledLocales : ["tr", "en", "ar"];
  const defaultLocale = s?.defaultLocale && enabled.includes(s.defaultLocale) ? s.defaultLocale : (enabled.includes("tr") ? "tr" : enabled[0]);
  return NextResponse.json({ enabled, defaultLocale }, {
    headers: { "cache-control": "public, max-age=60, s-maxage=60" },
  });
}
