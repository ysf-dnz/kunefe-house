import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, getDir } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteSettings, getSocialLinks } from "@/lib/settings";
import { organizationSchema, restaurantSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";
import { localize, type Locale } from "@/lib/i18n-field";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const loc = locale as Locale;
  const title =
    localize(settings?.heroTitle as Record<string, string> | null, loc) ||
    "Kunefe House — Tescilli Premium Künefe";
  const description =
    localize(settings?.heroSubtitle as Record<string, string> | null, loc) ||
    "Gelenekten geleceğe uzanan lezzet. Tescilli künefe markası Kunefe House.";
  return buildMetadata({
    locale,
    path: "/",
    title,
    description,
    image: settings?.logoHeaderUrl ?? null,
  });
}

// SiteSettings (WhatsApp no/mesaj, hero) DB'den okunur ve admin'den anlık
// değişebilir; bu yüzden subtree dynamic render edilir. SSG/CWV optimizasyonu
// (ör. "use cache" + cacheTag) Faz 5'te ele alınacak.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const [settings, socials] = await Promise.all([getSiteSettings(), getSocialLinks()]);

  return (
    <html lang={locale} dir={getDir(locale)}>
      <body className="font-sans antialiased">
        <JsonLd data={organizationSchema({ logoUrl: settings?.logoHeaderUrl, socials })} />
        <JsonLd
          data={restaurantSchema({
            logoUrl: settings?.logoHeaderUrl,
            phone: settings?.whatsappNumber,
            email: settings?.contactEmail,
          })}
        />
        <NextIntlClientProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
