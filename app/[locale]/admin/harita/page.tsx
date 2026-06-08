import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getSiteSettings } from "@/lib/settings";
import { getMapPins } from "@/lib/mappins";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MapEditor } from "@/components/admin/MapEditor";
import { updateMapImage, deletePin } from "./actions";

export default async function HaritaPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, pins] = await Promise.all([getSiteSettings(), getMapPins()]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-serif text-2xl text-gold">Malzeme Haritası</h1>

      {/* Harita görseli + başlık/açıklama */}
      <form action={updateMapImage} className="flex max-w-md flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h2 className="font-serif text-gold">Harita Görseli & Metinleri</h2>
        <ImageUpload name="mapImageUrl" label="Türkiye Harita Görseli" folder="map" defaultUrl={settings?.mapImageUrl} />
        <LocalizedInput name="mapTitle" label="Bölüm Başlığı" defaultValue={settings?.mapTitle as Record<string, string> | null} />
        <LocalizedInput name="mapDescription" label="Bölüm Açıklaması" defaultValue={settings?.mapDescription as Record<string, string> | null} multiline />
        <button className="btn-gold self-start rounded-full px-6 py-2 text-sm font-semibold">Kaydet</button>
      </form>

      {/* Pin ekleme editörü */}
      <MapEditor
        mapImageUrl={settings?.mapImageUrl ?? null}
        pins={pins.map((p) => ({ id: p.id, cityName: p.cityName, x: p.x, y: p.y }))}
      />

      {/* Mevcut pinler */}
      <div>
        <h2 className="mb-3 font-serif text-gold">Pinler ({pins.length})</h2>
        <ul className="flex flex-col gap-2">
          {pins.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded bg-forest-light px-4 py-2">
              <span>
                <strong>{p.cityName}</strong>
                <span className="ml-2 text-sm text-cream/60">
                  {(p.ingredient as Record<string, string>)?.tr} · ({p.x}%, {p.y}%)
                </span>
              </span>
              <form action={deletePin}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-sm text-red-400">Sil</button>
              </form>
            </li>
          ))}
          {pins.length === 0 && <p className="text-cream/60">Henüz pin yok.</p>}
        </ul>
      </div>
    </div>
  );
}
