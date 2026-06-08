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
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center">
        {/* Dekoratif altın hâle */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <span className="relative inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Tescilli Premium Künefe
        </span>

        <h1 className="relative max-w-4xl font-serif text-4xl leading-tight md:text-6xl">
          <span className="text-cream">{title}</span>
        </h1>

        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link href="/lezzetlerimiz" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide">
            {t("discover")}
          </Link>
          <Link href="/bayilik" className="btn-outline-gold rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide">
            {t("franchise")}
          </Link>
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
