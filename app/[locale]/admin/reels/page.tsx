import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getReels } from "@/lib/reels";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createReel, deleteReel } from "./actions";

export default async function ReelsPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const reels = await getReels();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Reels / Hikâye Şeridi</h1>

      <ul className="flex flex-wrap gap-4">
        {reels.map((r) => (
          <li key={r.id} className="card-premium flex w-44 flex-col gap-2 rounded-xl p-3">
            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-forest">
              {r.coverUrl && <Image src={r.coverUrl} alt="" fill className="object-cover" />}
            </div>
            <span className="truncate text-sm text-cream/80">
              {(r.title as Record<string, string>)?.tr || "—"}
            </span>
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
        <ImageUpload name="coverUrl" label="Kapak Görseli (dikey 9:16 ideal)" folder="reels" />
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Instagram Reel Linki</label>
          <input name="instagramUrl" placeholder="https://www.instagram.com/reel/ABC123/"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <span className="text-xs text-cream/40">
            Belirli bir <strong>reel/gönderi</strong> linki ver (örn. .../reel/ABC123/) — site içinde oynatılır.
            Profil linki (.../kunefehouse) verirsen sadece Instagram&apos;a yönlendirir.
          </span>
        </div>
        <LocalizedInput name="title" label="Başlık (opsiyonel)" />
        <SubmitButton>Ekle</SubmitButton>
      </form>
    </div>
  );
}
