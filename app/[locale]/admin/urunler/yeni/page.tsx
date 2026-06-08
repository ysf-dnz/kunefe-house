import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export default async function YeniUrunPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Yeni Ürün</h1>
      <ProductForm action={createProduct} categories={categories} />
    </div>
  );
}
