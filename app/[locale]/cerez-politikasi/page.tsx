import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { localize, type Locale } from "@/lib/i18n-field";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/public/LegalPage";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/cerez-politikasi", title: "Çerez Politikası" });
}

export default async function CerezPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  const content = localize(settings?.cookiePolicy as Record<string, string> | null, locale as Locale);
  return <LegalPage title="Çerez Politikası" content={content} />;
}
