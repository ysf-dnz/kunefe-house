import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getBranches } from "@/lib/branches";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createBranch, deleteBranch } from "./actions";

export default async function SubelerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const branches = await getBranches();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Şubeler</h1>

      <ul className="flex flex-col gap-2">
        {branches.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded bg-forest-light px-4 py-3">
            <span>
              <strong>{b.name}</strong>
              {b.phone && <span className="ml-2 text-sm text-cream/60">{b.phone}</span>}
              {!b.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}
            </span>
            <form action={deleteBranch}>
              <input type="hidden" name="id" value={b.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {branches.length === 0 && <p className="text-cream/60">Henüz şube yok. Franchise açıldıkça eklenecek.</p>}
      </ul>

      <form action={createBranch} className="flex max-w-lg flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h2 className="font-serif text-gold">Yeni Şube</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">Şube Adı</label>
          <input name="name" placeholder="Kunefe House Bağdat Cad."
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">Telefon</label>
          <input name="phone" placeholder="0212 555 55 55"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <LocalizedInput name="address" label="Adres" multiline />
        <LocalizedInput name="workingHours" label="Çalışma Saatleri" />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">E-posta</label>
          <input name="email" type="email" placeholder="sube@kunefehouse.com" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="lat" type="number" step="any" placeholder="Enlem (lat)" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="lng" type="number" step="any" placeholder="Boylam (lng)" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input type="checkbox" name="isActive" defaultChecked /> Aktif
        </label>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-cream/80">Google Maps Embed URL</label>
          <input name="mapsEmbedUrl" placeholder="https://www.google.com/maps/embed?..."
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <span className="text-xs text-cream/40">Google Maps → Paylaş → Harita yerleştir → src bağlantısı</span>
        </div>
        <SubmitButton>Ekle</SubmitButton>
      </form>
    </div>
  );
}
