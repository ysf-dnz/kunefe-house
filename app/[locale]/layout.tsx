import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, getDir } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd } from "@/components/seo/JsonLd";
import { NewsPopup } from "@/components/public/NewsPopup";
import { CookieBanner } from "@/components/public/CookieBanner";
import { CartProvider } from "@/components/shop/CartProvider";
import { BranchGate } from "@/components/layout/BranchGate";
import { getPopupNews } from "@/lib/news";
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
  // Hata yutulmaz (bkz. aşağıdaki not): varsayılan başlıklı metadata önbelleğe girmesin.
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

// Public sayfalar ISR: build'de üretilir, en geç 1 saatte bir arka planda yenilenir.
// Admin'de public içeriği değiştiren her action revalidatePath("/", "layout") çağırır,
// yani değişiklikler beklemeden yansır. Bu layout (ve Header/BranchGate) çerez/header
// OKUMAMALI; okursa altındaki tüm sayfalar yeniden dinamik olur. Şubeye bağlı
// lezzetlerimiz sayfaları kendi içinde cookies() okuyup dinamik kalır.
export const revalidate = 3600;

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

  // DB hataları bilerek yutulmaz. ISR'de boş varsayılanlarla üretilen bir sayfa
  // 1 saat boyunca herkese sunulurdu; hata fırlarsa Next yenilemeyi başarısız sayar
  // ve son başarılı sürümü sunmaya devam eder (bir sonraki istekte tekrar dener).
  const [settings, socials, popupNews] = await Promise.all([
    getSiteSettings(),
    getSocialLinks(),
    getPopupNews(),
  ]);
  // Dil aç/kapa: TR her zaman açık; kapalı EN/AR'a doğrudan erişim engellenir
  const enabledLocales = settings?.enabledLocales ?? ["tr", "en", "ar"];
  if (locale !== "tr" && !enabledLocales.includes(locale)) notFound();
  const loc = locale as Locale;

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
          <CartProvider>
            <BranchGate />
            <Header />
            <main>{children}</main>
            <Footer />
            <WhatsAppButton />
            <CookieBanner />
            {popupNews && settings?.showNews !== false && (
              <NewsPopup
                id={popupNews.id}
                title={localize(popupNews.title as Record<string, string>, loc)}
                body={localize(popupNews.body as Record<string, string> | null, loc)}
                imageUrl={popupNews.imageUrl}
              />
            )}
          </CartProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
