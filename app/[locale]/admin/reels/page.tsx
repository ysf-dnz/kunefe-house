import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getReels } from "@/lib/reels";
import { getProducts } from "@/lib/products";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createReel, deleteReel, setReelProducts } from "./actions";

export default async function ReelsPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const reels = await getReels();
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Reels / Hikâye Şeridi</h1>

      <ul className="flex flex-wrap gap-4">
        {reels.map((r) => (
          <li key={r.id} className="card-premium flex w-56 flex-col gap-2 rounded-xl p-3">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-forest">
              {r.coverUrl && <Image src={r.coverUrl} alt="" fill className="object-cover" />}
            </div>
            <span className="truncate text-sm text-cream/80">
              {(r.title as Record<string, string>)?.tr || "—"}
            </span>
            <form action={setReelProducts} className="flex flex-col gap-1">
              <input type="hidden" name="id" value={r.id} />
              <span className="text-xs text-cream/60">Görüneceği ürünler:</span>
              <div className="max-h-28 overflow-y-auto rounded border border-copper/20 p-1">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 text-xs text-cream/80">
                    <input type="checkbox" name="productIds" value={p.id}
                      defaultChecked={(r.products ?? []).some((rp) => rp.id === p.id)} />
                    <span className="truncate">{(p.title as Record<string, string>)?.tr || "—"}</span>
                  </label>
                ))}
              </div>
              <button className="rounded bg-gold/20 px-2 py-1 text-xs text-gold">Ürünleri Kaydet</button>
            </form>
            <form action={deleteReel}>
              <input type="hidden" name="id" value={r.id} />
              <button className="text-xs text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {reels.length === 0 && <p className="text-cream/60">Henüz reel yok. Aşağıdan ekleyin.</p>}
      </ul>

      <form action={createReel} className="flex max-w-md flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h2 className="font-serif text-gold">Yeni Reel</h2>
        <ImageUpload name="videoUrl" label="Video (dikey 9:16, sitede kendiliğinden oynar)" folder="reels" accept="video/*" />
        <ImageUpload name="coverUrl" label="Kapak Görseli (video yüklenince poster olur, opsiyonel)" folder="reels" />
        <p className="text-xs text-cream/40">
          📹 <strong>Video yükle</strong> → kart sitede <strong>kendiliğinden sessiz oynar</strong> (önerilen).
          Kapak + link, ya da <strong>yalnız Instagram linki</strong> de yeterli (tıklayınca açılır).
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Instagram Linki (opsiyonel)</label>
          <input name="instagramUrl" placeholder="https://www.instagram.com/reel/ABC123/"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <LocalizedInput name="title" label="Başlık (opsiyonel)" />
        <SubmitButton>Ekle</SubmitButton>
      </form>
    </div>
  );
}
