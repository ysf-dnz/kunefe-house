import Link from "next/link";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getProducts } from "@/lib/products";
import { deleteProduct } from "./actions";

export default async function UrunlerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const products = await getProducts();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-gold">Ürünler</h1>
        <Link href="/admin/urunler/yeni" className="rounded bg-gold px-4 py-2 text-sm font-medium text-forest">+ Yeni Ürün</Link>
      </div>
      <ul className="flex flex-col gap-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-4 rounded bg-forest-light px-4 py-2">
            {p.primaryImageUrl ? (
              <Image src={p.primaryImageUrl} alt="" width={48} height={48} className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-forest" />
            )}
            <span className="flex-1">{(p.title as Record<string, string>)?.tr ?? p.slug}</span>
            {p.featured && <span className="text-xs text-gold">★ öne çıkan</span>}
            <Link href={`/admin/urunler/${p.id}`} className="text-sm text-cream/80">Düzenle</Link>
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {products.length === 0 && <p className="text-cream/60">Henüz ürün yok. &quot;Yeni Ürün&quot; ile ekleyin.</p>}
      </ul>
    </div>
  );
}
