import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getProducts, getCategories } from "@/lib/products";
import { getGeneralReels } from "@/lib/reels";
import { ReelsStrip } from "@/components/public/ReelsStrip";
import { localize, type Locale } from "@/lib/i18n-field";
import { toNumber } from "@/lib/price";
import { ProductCard } from "@/components/public/ProductCard";
import type { Portion } from "@/lib/portions";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({
    locale,
    path: "/lezzetlerimiz",
    title: t("menuTitle"),
    description: t("menuDesc"),
  });
}

export default async function LezzetlerimizPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { locale } = await params;
  const { kategori } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const tm = await getTranslations("menu");
  const tc = await getTranslations("common");
  const [products, categories, reels] = await Promise.all([getProducts(), getCategories(), getGeneralReels()]);
  const filtered = kategori ? products.filter((p) => p.categoryId === kategori) : products;

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-3 flex justify-center">
          <span className="text-xs uppercase tracking-[0.3em] text-copper">{tm("eyebrow")}</span>
        </div>
        <h1 className="text-center font-serif text-4xl text-gold-gradient md:text-5xl">{t("menu")}</h1>
        <div className="mx-auto mt-5 mb-12 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <div className="mb-12 flex flex-wrap justify-center gap-3">
          <Link href="/lezzetlerimiz"
            className={`rounded-full px-5 py-1.5 text-sm transition-all ${!kategori ? "pill-gold" : "btn-outline-gold"}`}>
            {tc("all")}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/lezzetlerimiz?kategori=${c.id}`}
              className={`rounded-full px-5 py-1.5 text-sm transition-all ${kategori === c.id ? "pill-gold" : "btn-outline-gold"}`}>
              {localize(c.name as Record<string, string>, locale as Locale)}
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-cream/60">{tm("empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} slug={p.slug} locale={locale as Locale}
                title={p.title as Record<string, string> | null}
                shortDescription={p.shortDescription as Record<string, string> | null}
                primaryImageUrl={p.primaryImageUrl} secondaryImageUrl={p.secondaryImageUrl}
                price={toNumber(p.price)} oldPrice={toNumber(p.oldPrice)} showPrice={p.showPrice}
                portions={(p.portions as Portion[] | null) ?? null}
                priceUsd={toNumber(p.priceUsd)} oldPriceUsd={toNumber(p.oldPriceUsd)}
                priceQar={toNumber(p.priceQar)} oldPriceQar={toNumber(p.oldPriceQar)} />
            ))}
          </div>
        )}
      </section>
      {reels.length > 0 && (
        <ReelsStrip
          reels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl, videoUrl: r.videoUrl, instagramUrl: r.instagramUrl }))}
          locale={locale as Locale}
          heading={tm("reelsHeading")}
        />
      )}
    </>
  );
}
