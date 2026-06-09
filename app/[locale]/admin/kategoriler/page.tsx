import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCategories } from "@/lib/products";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createCategory, deleteCategory } from "./actions";

export default async function KategorilerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getCategories();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kategoriler</h1>
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded bg-forest-light px-4 py-2">
            <span>{(c.name as Record<string, string>)?.tr ?? c.slug}</span>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {categories.length === 0 && <p className="text-cream/60">Henüz kategori yok.</p>}
      </ul>
      <form action={createCategory} className="flex max-w-md flex-col gap-4 rounded bg-forest-light p-4">
        <h2 className="font-serif text-gold">Yeni Kategori</h2>
        <LocalizedInput name="name" label="Ad" />
        <SubmitButton>Ekle</SubmitButton>
      </form>
    </div>
  );
}
