import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getAllNews } from "@/lib/news";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createNews, deleteNews } from "./actions";

export default async function HaberlerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const news = await getAllNews();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Haberler / Gündem</h1>

      <ul className="flex flex-col gap-2">
        {news.map((n) => (
          <li key={n.id} className="flex items-center gap-4 rounded bg-forest-light px-4 py-2">
            {n.imageUrl ? (
              <Image src={n.imageUrl} alt="" width={48} height={48} className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-forest" />
            )}
            <span className="flex-1">{(n.title as Record<string, string>)?.tr}</span>
            {n.published ? <span className="text-xs text-green-400">● yayında</span> : <span className="text-xs text-cream/40">● taslak</span>}
            {n.asPopup && <span className="text-xs text-gold">★ popup</span>}
            <form action={deleteNews}>
              <input type="hidden" name="id" value={n.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {news.length === 0 && <p className="text-cream/60">Henüz haber yok.</p>}
      </ul>

      <form action={createNews} className="flex max-w-lg flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h2 className="font-serif text-gold">Yeni Haber</h2>
        <LocalizedInput name="title" label="Başlık" />
        <LocalizedInput name="body" label="Metin" multiline />
        <ImageUpload name="imageUrl" label="Görsel" folder="news" />
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input type="checkbox" name="published" defaultChecked /> Yayında
        </label>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input type="checkbox" name="asPopup" /> Sitede popup olarak göster (tek aktif popup)
        </label>
        <button className="btn-gold self-start rounded-full px-6 py-2 text-sm font-semibold">Ekle</button>
      </form>
    </div>
  );
}
