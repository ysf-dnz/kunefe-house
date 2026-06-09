import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kunefehouse.com";
export const SITE_NAME = "Kunefe House";

/** as-needed: varsayılan (tr) öneksiz, diğerleri /en /ar */
export function localizedPath(locale: string, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

/** Tüm diller için hreflang alternates üretir */
function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = `${SITE_URL}${localizedPath(loc, path)}`;
  }
  return { languages, "x-default": `${SITE_URL}${localizedPath(routing.defaultLocale, path)}` };
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
}: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const url = `${SITE_URL}${localizedPath(locale, path)}`;
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const images = image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages: buildAlternates(path).languages,
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url,
      locale,
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}
