import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { localize, type Locale } from "@/lib/i18n-field";
import { formatPrice } from "@/lib/price";
import { getCargoProducts, isCargoEnabled } from "@/lib/cargo-catalog";
import { AddToCartButton } from "@/components/shop/AddToCartButton";

export default async function MagazaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isCargoEnabled())) notFound();
  const t = await getTranslations("shop");
  const loc = locale as Locale;
  const products = await getCargoProducts();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{t("title")}</h1>
      <p className="mt-3 text-center text-cream/70">{t("subtitle")}</p>
      <div className="mx-auto mt-4 mb-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {products.length === 0 ? (
        <p className="text-center text-cream/60">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const price = p.price != null ? Number(p.price) : null;
            const name = localize(p.title as Record<string, string>, loc);
            return (
              <div key={p.id} className="card-premium flex flex-col overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/3] bg-forest">
                  {p.primaryImageUrl && <Image src={p.primaryImageUrl} alt={name} fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h2 className="font-serif text-lg text-cream">{name}</h2>
                  {price != null && <span className="font-serif text-2xl text-gold">{formatPrice(price, "TRY")}</span>}
                  <div className="mt-auto">
                    <AddToCartButton
                      item={{ productId: p.id, title: name, price: price ?? 0, qty: 1, imageUrl: p.primaryImageUrl }}
                      soldOut={price == null}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
