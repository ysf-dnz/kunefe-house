import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/products";
import { localize, type Locale } from "@/lib/i18n-field";
import { buildMetadata, localizedPath, SITE_URL } from "@/lib/seo";
import { productSchema, breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  const loc = locale as Locale;
  if (!product) return buildMetadata({ locale, path: `/lezzetlerimiz/${slug}`, title: "Ürün" });
  const name = localize(product.title as Record<string, string>, loc);
  return buildMetadata({
    locale,
    path: `/lezzetlerimiz/${slug}`,
    title: name,
    description: localize(product.shortDescription as Record<string, string> | null, loc),
    image: product.primaryImageUrl,
    type: "article",
  });
}

export default async function UrunDetayPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const loc = locale as Locale;
  const ingredients = (product.ingredients as string[] | null) ?? [];
  const name = localize(product.title as Record<string, string>, loc);
  const productUrl = `${SITE_URL}${localizedPath(locale, `/lezzetlerimiz/${slug}`)}`;

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
      <JsonLd data={productSchema({ name, description: localize(product.shortDescription as Record<string, string> | null, loc), image: product.primaryImageUrl, url: productUrl })} />
      <JsonLd data={breadcrumbSchema([
        { name: "Ana Sayfa", path: localizedPath(locale, "/") },
        { name: "Lezzetlerimiz", path: localizedPath(locale, "/lezzetlerimiz") },
        { name, path: localizedPath(locale, `/lezzetlerimiz/${slug}`) },
      ])} />
      <div className="relative aspect-square overflow-hidden rounded-lg bg-forest-light">
        {product.primaryImageUrl && (
          <Image src={product.primaryImageUrl} alt={localize(product.title as Record<string, string>, loc)}
            fill className="object-cover" priority />
        )}
      </div>
      <div>
        <h1 className="font-serif text-4xl text-gold">{localize(product.title as Record<string, string>, loc)}</h1>
        <p className="mt-4 text-cream/80">{localize(product.shortDescription as Record<string, string> | null, loc)}</p>
        {ingredients.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif text-lg text-copper">İçindekiler</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="rounded-full border border-copper/40 px-3 py-1 text-sm text-cream/80">{ing}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
