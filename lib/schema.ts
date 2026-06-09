import { SITE_NAME, SITE_URL } from "./seo";

type SocialLink = { platform: string; url: string };

export function organizationSchema(opts: {
  logoUrl?: string | null;
  socials?: SocialLink[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    sameAs: (opts.socials ?? []).map((s) => s.url),
  };
}

export function restaurantSchema(opts: {
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE_NAME,
    url: SITE_URL,
    servesCuisine: "Turkish Dessert",
    ...(opts.logoUrl ? { image: opts.logoUrl } : {}),
    ...(opts.phone ? { telephone: opts.phone } : {}),
    ...(opts.email ? { email: opts.email } : {}),
  };
}

export function productSchema(opts: {
  name: string;
  description?: string;
  image?: string | null;
  url: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: opts.image } : {}),
    url: opts.url,
    brand: { "@type": "Brand", name: SITE_NAME },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}
