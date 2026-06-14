import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CourierTracker } from "@/components/courier/CourierTracker";

export const dynamic = "force-dynamic";

export default async function KuryePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const courier = await prisma.courier.findUnique({ where: { token } });
  if (!courier) notFound();

  const orders = await prisma.order.findMany({
    where: { courierId: courier.id, status: { notIn: ["delivered", "cancelled"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 bg-forest p-5 text-cream">
      <h1 className="font-serif text-2xl text-gold">Merhaba {courier.name}</h1>
      <CourierTracker token={token} />

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg text-copper">Aktif Siparişlerin ({orders.length})</h2>
        {orders.length === 0 && <p className="text-sm text-cream/60">Şu an atanmış siparişin yok.</p>}
        {orders.map((o) => {
          const maps = o.locationUrl ?? (o.lat != null && o.lng != null ? `https://maps.google.com/?q=${o.lat},${o.lng}` : null);
          return (
            <div key={o.id} className="rounded-xl border border-copper/30 bg-forest-light/40 p-4">
              <p className="font-medium text-cream">{o.productTitle}{o.persons ? ` · ${o.persons} kişilik` : ""}</p>
              <p className="text-sm text-cream/70">{o.customerName ?? "—"}</p>
              {o.addressNote && <p className="mt-1 text-sm text-cream/60">{o.addressNote}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {maps && (
                  <a href={maps} target="_blank" rel="noopener noreferrer"
                    className="rounded-full bg-gold/20 px-4 py-1.5 text-sm text-gold">📍 Yol Tarifi</a>
                )}
                {o.customerPhone && (
                  <a href={`tel:${o.customerPhone.replace(/[^0-9+]/g, "")}`}
                    className="rounded-full bg-copper/20 px-4 py-1.5 text-sm text-copper">📞 Ara</a>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
