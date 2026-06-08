import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { getFeaturedProducts } from "@/lib/products";
import { localize, type Locale } from "@/lib/i18n-field";
import { FeaturedSlider } from "@/components/public/FeaturedSlider";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const tn = await getTranslations("nav");
  const [settings, featured] = await Promise.all([getSiteSettings(), getFeaturedProducts()]);
  const loc = locale as Locale;
  const title = localize(settings?.heroTitle as Record<Locale, string> | null, loc) || t("title");

  return (
    <>
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
        <h1 className="font-serif text-4xl md:text-6xl text-cream max-w-3xl">{title}</h1>
        <div className="flex gap-4">
          <Link href="/lezzetlerimiz" className="rounded bg-gold px-6 py-3 font-medium text-forest">{t("discover")}</Link>
          <Link href="/bayilik" className="rounded border border-copper px-6 py-3 font-medium text-cream">{t("franchise")}</Link>
        </div>
      </section>
      <FeaturedSlider
        items={featured.map((p) => ({ id: p.id, slug: p.slug, title: p.title as Record<string, string> | null, primaryImageUrl: p.primaryImageUrl }))}
        locale={loc}
        heading={tn("menu")}
      />
    </>
  );
}
