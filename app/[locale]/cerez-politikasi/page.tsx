import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { localize, type Locale } from "@/lib/i18n-field";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/public/LegalPage";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({ locale, path: "/cerez-politikasi", title: t("cookieTitle"), description: t("cookieDesc") });
}

export default async function CerezPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tl = await getTranslations("legal");
  const settings = await getSiteSettings();
  const content = localize(settings?.cookiePolicy as Record<string, string> | null, locale as Locale);
  return <LegalPage title={tl("cookieTitle")} content={content} />;
}
