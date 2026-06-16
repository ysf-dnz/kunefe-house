import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireHQ } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { getReels } from "@/lib/reels";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { toNumber } from "@/lib/price";
import type { Portion } from "@/lib/portions";
import { updateProduct } from "../actions";

export default async function UrunDuzenlePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  await requireHQ();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [product, categories, reels] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { reels: { select: { id: true } } } }),
    getCategories(),
    getReels(),
  ]);
  if (!product) notFound();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Ürün Düzenle</h1>
      <ProductForm action={updateProduct} categories={categories}
        product={{
          id: product.id,
          title: product.title as Record<string, string> | null,
          shortDescription: product.shortDescription as Record<string, string> | null,
          ingredients: product.ingredients,
          primaryImageUrl: product.primaryImageUrl,
          secondaryImageUrl: product.secondaryImageUrl,
          categoryId: product.categoryId,
          featured: product.featured,
          price: toNumber(product.price),
          oldPrice: toNumber(product.oldPrice),
          showPrice: product.showPrice,
          portions: (product.portions as Portion[] | null) ?? null,
          cargoAvailable: product.cargoAvailable,
          cargoStock: product.cargoStock,
          priceUsd: toNumber(product.priceUsd),
          oldPriceUsd: toNumber(product.oldPriceUsd),
          priceQar: toNumber(product.priceQar),
          oldPriceQar: toNumber(product.oldPriceQar),
        }}
        allReels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl }))}
        selectedReelIds={(product.reels ?? []).map((r) => r.id)} />
    </div>
  );
}
