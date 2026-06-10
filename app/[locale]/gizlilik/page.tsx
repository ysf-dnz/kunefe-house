import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getSiteSettings } from "@/lib/settings";
import { localize, type Locale } from "@/lib/i18n-field";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/public/LegalPage";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/gizlilik", title: "Gizlilik Politikası ve KVKK" });
}

export default async function GizlilikPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSiteSettings();
  const content = localize(settings?.privacyPolicy as Record<string, string> | null, locale as Locale);
  return <LegalPage title="Gizlilik Politikası ve KVKK" content={content} />;
}
