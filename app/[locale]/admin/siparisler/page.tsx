import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getOrders } from "@/lib/orders";
import { toNumber, formatPrice } from "@/lib/price";
import { updateOrderStatus, deleteOrder } from "./actions";
import { getAvailableCouriers } from "@/lib/couriers";
import { CourierAssign } from "@/components/admin/CourierAssign";

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Yeni", cls: "text-gold" },
  confirmed: { label: "Onaylandı", cls: "text-pistachio" },
  preparing: { label: "Hazırlanıyor", cls: "text-amber-400" },
  on_the_way: { label: "Yolda", cls: "text-blue-400" },
  delivered: { label: "Teslim edildi", cls: "text-green-400" },
  cancelled: { label: "İptal", cls: "text-red-400" },
};

export default async function SiparislerPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const orders = await getOrders();
  const availableCouriers = await getAvailableCouriers();
  const courierLite = availableCouriers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Siparişler ({orders.length})</h1>
      <ul className="flex flex-col gap-3">
        {orders.map((o) => {
          const price = toNumber(o.price);
          return (
            <li key={o.id} className="card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-cream">
                  {o.productTitle}{o.persons ? ` · ${o.persons} kişilik` : ""}
                  {price != null ? ` · ${formatPrice(price, "tr")}` : ""}
                  <span className={`ml-2 text-xs ${STATUS[o.status]?.cls ?? "text-cream/60"}`}>● {STATUS[o.status]?.label ?? o.status}</span>
                </p>
                <p className="text-sm text-cream/70">
                  {o.customerName ?? "—"}{o.customerPhone ? ` · ${o.customerPhone}` : ""}
                </p>
                {o.courier && <p className="mt-1 text-sm text-gold/90">🛵 {o.courier.name}{o.courier.phone ? ` · ${o.courier.phone}` : ""}</p>}
                {o.addressNote && <p className="mt-1 text-sm text-cream/50">{o.addressNote}</p>}
                {o.note && <p className="mt-1 text-sm text-cream/50">📝 {o.note}</p>}
                <p className="mt-1 text-xs text-cream/40">{new Date(o.createdAt).toLocaleString("tr-TR")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {o.locationUrl && (
                  <a href={o.locationUrl} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">📍 Konum</a>
                )}
                {o.customerPhone && (
                  <a href={`https://wa.me/${o.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">WhatsApp</a>
                )}
                <form action={updateOrderStatus} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <select name="status" defaultValue={o.status}
                    className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
                    <option value="new">Yeni</option>
                    <option value="confirmed">Onaylandı</option>
                    <option value="preparing">Hazırlanıyor</option>
                    <option value="on_the_way">Yolda</option>
                    <option value="delivered">Teslim edildi</option>
                    <option value="cancelled">İptal</option>
                  </select>
                  <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Güncelle</button>
                </form>
                <form action={deleteOrder}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-sm text-red-400">Sil</button>
                </form>
                <CourierAssign
                  order={{
                    id: o.id,
                    productTitle: o.productTitle,
                    persons: o.persons,
                    customerName: o.customerName,
                    customerPhone: o.customerPhone,
                    addressNote: o.addressNote,
                    locationUrl: o.locationUrl,
                  }}
                  couriers={courierLite}
                  assignedId={o.courierId}
                  assignedName={o.courier?.name ?? null}
                  assignedPhone={o.courier?.phone ?? null}
                />
              </div>
            </li>
          );
        })}
        {orders.length === 0 && <p className="text-cream/60">Henüz sipariş yok.</p>}
      </ul>
    </div>
  );
}
