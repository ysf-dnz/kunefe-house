import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { localize, type Locale } from "@/lib/i18n-field";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const settings = await getSiteSettings();
  const title = localize(settings?.heroTitle as Record<Locale, string> | null, locale as Locale) || t("title");
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">{title}</h1>
      <div className="flex gap-4">
        <Link href="#" className="rounded bg-gold px-6 py-3 font-medium text-forest">{t("discover")}</Link>
        <Link href="#" className="rounded border border-copper px-6 py-3 font-medium text-cream">{t("franchise")}</Link>
      </div>
    </section>
  );
}
