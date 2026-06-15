import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { getReels } from "@/lib/reels";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export default async function YeniUrunPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  const reels = await getReels();
  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-gold">Yeni Ürün</h1>
      <ProductForm action={createProduct} categories={categories}
        allReels={reels.map((r) => ({ id: r.id, title: r.title as Record<string, string> | null, coverUrl: r.coverUrl }))}
        selectedReelIds={[]} />
    </div>
  );
}
