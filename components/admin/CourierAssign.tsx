"use client";

import { buildCourierMessage } from "@/lib/courier-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { assignCourier } from "@/app/[locale]/admin/siparisler/actions";

export type CourierLite = { id: string; name: string; phone: string };
export type AssignOrder = {
  id: string;
  productTitle: string;
  persons: number | null;
  customerName: string | null;
  customerPhone: string | null;
  addressNote: string | null;
  locationUrl: string | null;
};

export function CourierAssign({
  order, couriers, assignedId, assignedName, assignedPhone,
}: {
  order: AssignOrder;
  couriers: CourierLite[];
  assignedId: string | null;
  assignedName: string | null;
  assignedPhone: string | null;
}) {
  function sendToCourier() {
    if (!assignedPhone) return;
    const message = buildCourierMessage({
      productTitle: order.productTitle,
      persons: order.persons,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      addressNote: order.addressNote,
      locationUrl: order.locationUrl,
    });
    window.open(buildWhatsAppHref(assignedPhone, message), "_blank", "noopener,noreferrer");
  }

  const options = [...couriers];
  if (assignedId && !options.some((c) => c.id === assignedId)) {
    options.unshift({ id: assignedId, name: assignedName ?? "Atanmış kurye", phone: assignedPhone ?? "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={assignCourier} className="flex items-center gap-2">
        <input type="hidden" name="id" value={order.id} />
        <select name="courierId" defaultValue={assignedId ?? ""}
          className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
          <option value="">— Kurye yok —</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Ata</button>
      </form>
      {assignedPhone && (
        <button type="button" onClick={sendToCourier}
          className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">🛵 Kuryeye Gönder</button>
      )}
    </div>
  );
}
