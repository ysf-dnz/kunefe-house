import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getTrackingSnapshot } from "@/lib/couriers";
import { LiveMapClient } from "@/components/admin/LiveMapClient";

export default async function CanliTakipPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const snapshot = await getTrackingSnapshot();
  const initial = {
    couriers: snapshot.couriers.map((c) => ({ ...c, lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : null })),
    orders: snapshot.orders,
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-2xl text-gold">Canlı Takip</h1>
      <p className="text-sm text-cream/60">🛵 Canlı kuryeler (son 5 dk) · 🏠 Aktif sipariş konumları · 15 sn'de bir güncellenir.</p>
      <LiveMapClient initial={initial} />
    </div>
  );
}
