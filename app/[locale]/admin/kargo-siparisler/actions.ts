"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { markShopOrderShipped } from "@/lib/shop";
import { prisma } from "@/lib/prisma";

const s = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function shipOrder(formData: FormData) {
  await requireHQ();
  const id = s(formData.get("id"), 64);
  const trackingNo = s(formData.get("trackingNo"), 80);
  const carrier = s(formData.get("carrier"), 40);
  if (!id || !trackingNo || !carrier) return;
  await markShopOrderShipped(id, trackingNo, carrier);
  revalidatePath("/admin/kargo-siparisler");
}

export async function markDelivered(formData: FormData) {
  await requireHQ();
  const id = s(formData.get("id"), 64);
  if (!id) return;
  await prisma.shopOrder.update({ where: { id }, data: { status: "delivered" } });
  revalidatePath("/admin/kargo-siparisler");
}
