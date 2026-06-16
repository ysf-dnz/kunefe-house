"use client";

import { buildCargoMessage, CARRIERS } from "@/lib/cargo-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { shipOrder } from "@/app/[locale]/admin/kargo-siparisler/actions";

type Props = {
  id: string; phone: string; customerName: string;
  trackingNo: string | null; carrier: string | null; status: string;
};

export function ShipForm({ id, phone, customerName, trackingNo, carrier }: Props) {
  function sendWhatsapp() {
    if (!trackingNo || !carrier) return;
    const msg = buildCargoMessage({ customerName, trackingNo, carrier, locale: "tr" });
    window.open(buildWhatsAppHref(phone, msg), "_blank", "noopener,noreferrer");
  }
  return (
    <div className="flex flex-col gap-2">
      <form action={shipOrder} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <select name="carrier" defaultValue={carrier ?? ""} className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
          <option value="">Firma…</option>
          {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input name="trackingNo" defaultValue={trackingNo ?? ""} placeholder="Takip No"
          className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
        <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Kaydet & Kargolandı</button>
      </form>
      {trackingNo && carrier && (
        <button type="button" onClick={sendWhatsapp}
          className="self-start rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">
          Müşteriye WhatsApp Gönder
        </button>
      )}
    </div>
  );
}
