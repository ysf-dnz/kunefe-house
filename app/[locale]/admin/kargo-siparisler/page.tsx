import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getShopOrders } from "@/lib/shop";
import { formatPrice } from "@/lib/price";
import { ShipForm } from "@/components/admin/ShipForm";
import { markDelivered } from "./actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Ödeme bekliyor", cls: "text-cream/50" },
  paid: { label: "Ödendi", cls: "text-gold" },
  shipped: { label: "Kargolandı", cls: "text-pistachio" },
  delivered: { label: "Teslim edildi", cls: "text-green-400" },
  cancelled: { label: "İptal", cls: "text-red-400" },
};

export default async function KargoSiparislerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const orders = (await getShopOrders()).filter((o) => o.status !== "pending_payment" && o.status !== "cancelled");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Kargo Siparişleri ({orders.length})</h1>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => (
          <li key={o.id} className="card-premium flex flex-col gap-3 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-cream">
                {o.customerName} · {o.customerPhone}
                <span className={`ml-2 text-xs ${STATUS[o.status]?.cls}`}>● {STATUS[o.status]?.label ?? o.status}</span>
              </p>
              <span className="font-serif text-gold">{formatPrice(Number(o.total), "TRY")}</span>
            </div>
            <p className="text-sm text-cream/70">{o.addressFull} — {o.addressDistrict}/{o.addressCity} {o.addressPostal ?? ""}</p>
            <ul className="text-sm text-cream/60">
              {o.items.map((it) => <li key={it.id}>• {it.title} × {it.qty} — {formatPrice(Number(it.lineTotal), "TRY")}</li>)}
            </ul>
            <p className="text-xs text-cream/40">{new Date(o.createdAt).toLocaleString("tr-TR")} · {o.customerEmail}</p>
            <ShipForm id={o.id} phone={o.customerPhone} customerName={o.customerName}
              trackingNo={o.trackingNo} carrier={o.carrier} status={o.status} />
            {o.status === "shipped" && (
              <form action={markDelivered}>
                <input type="hidden" name="id" value={o.id} />
                <button className="text-sm text-green-400">Teslim Edildi İşaretle</button>
              </form>
            )}
          </li>
        ))}
        {orders.length === 0 && <p className="text-cream/60">Henüz kargo siparişi yok.</p>}
      </ul>
    </div>
  );
}
