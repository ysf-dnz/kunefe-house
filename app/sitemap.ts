import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL, localizedPath } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";

const STATIC_PATHS = ["/", "/lezzetlerimiz", "/malzemelerimiz", "/bayilik", "/iletisim"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const settings = await getSiteSettings().catch(() => null);
  const enabled = settings?.enabledLocales?.length ? settings.enabledLocales : [...routing.locales];
  const defaultLocale = settings?.defaultLocale && enabled.includes(settings.defaultLocale)
    ? settings.defaultLocale
    : (enabled.includes("tr") ? "tr" : enabled[0]);

  function addPath(path: string, priority: number) {
    const languages: Record<string, string> = {};
    for (const loc of routing.locales) {
      if (enabled.includes(loc)) languages[loc] = `${SITE_URL}${localizedPath(loc, path)}`;
    }
    entries.push({
      url: `${SITE_URL}${localizedPath(defaultLocale, path)}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority,
      alternates: { languages },
    });
  }

  for (const p of STATIC_PATHS) addPath(p, p === "/" ? 1 : 0.8);

  // Ürün detay sayfaları
  try {
    const products = await prisma.product.findMany({ select: { slug: true } });
    for (const pr of products) addPath(`/lezzetlerimiz/${pr.slug}`, 0.6);
  } catch {
    // DB erişilemezse statik yollarla devam et
  }

  return entries;
}
