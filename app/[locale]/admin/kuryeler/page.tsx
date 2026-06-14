import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getCouriers } from "@/lib/couriers";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { SITE_URL } from "@/lib/seo";
import { createCourier, toggleAvailability, toggleActive, deleteCourier, ensureCourierToken } from "./actions";

export default async function KuryelerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const couriers = await getCouriers();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kuryeler ({couriers.length})</h1>

      <form action={createCourier} className="card-premium flex max-w-xl flex-col gap-3 rounded-xl p-4">
        <h2 className="font-serif text-gold">Yeni Kurye</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Ad Soyad *"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="phone" required placeholder="Telefon *"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="vehicle" placeholder="Taşıt / plaka (ops.)"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
          <input name="note" placeholder="Not (ops.)"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <SubmitButton>Kurye Ekle</SubmitButton>
      </form>

      <ul className="flex flex-col gap-3">
        {couriers.map((c) => (
          <li key={c.id} className={`card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between ${c.isActive ? "" : "opacity-50"}`}>
            <div>
              <p className="font-medium text-cream">
                {c.name}
                <span className={`ml-2 text-xs ${c.isAvailable ? "text-green-400" : "text-red-400"}`}>
                  ● {c.isAvailable ? "Müsait" : "Meşgul"}
                </span>
                {!c.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}
              </p>
              <p className="text-sm text-cream/70">{c.phone}{c.vehicle ? ` · ${c.vehicle}` : ""}</p>
              {c.note && <p className="mt-1 text-sm text-cream/50">{c.note}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">WhatsApp</a>
              {c.token ? (
                <>
                  <a href={`${SITE_URL}/kurye/${c.token}`} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum Linki</a>
                  <a href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Konum paylaşım sayfan: ${SITE_URL}/kurye/${c.token}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">Linki Kuryeye Gönder</a>
                </>
              ) : (
                <form action={ensureCourierToken}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum Linki Üret</button>
                </form>
              )}
              <form action={toggleAvailability}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="value" value={(!c.isAvailable).toString()} />
                <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">
                  {c.isAvailable ? "Meşgul yap" : "Müsait yap"}
                </button>
              </form>
              <form action={toggleActive}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="value" value={(!c.isActive).toString()} />
                <button className="rounded bg-copper/20 px-3 py-1 text-sm text-copper">
                  {c.isActive ? "Pasifleştir" : "Aktifleştir"}
                </button>
              </form>
              <form action={deleteCourier}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-sm text-red-400">Sil</button>
              </form>
            </div>
          </li>
        ))}
        {couriers.length === 0 && <p className="text-cream/60">Henüz kurye yok.</p>}
      </ul>
    </div>
  );
}
