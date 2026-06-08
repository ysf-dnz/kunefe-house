import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "../actions";

export default async function UrunDuzenlePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  await requireAdmin();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getCategories(),
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
          ingredients: (product.ingredients as string[] | null) ?? [],
          primaryImageUrl: product.primaryImageUrl,
          secondaryImageUrl: product.secondaryImageUrl,
          categoryId: product.categoryId,
          featured: product.featured,
        }} />
    </div>
  );
}
