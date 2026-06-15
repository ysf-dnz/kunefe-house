"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireHQ } from "@/lib/require-admin";
import type { SessionUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

async function assertOrderAccess(id: string, me: SessionUser) {
  if (me.role === "HQ_ADMIN") return;
  const o = await prisma.order.findUnique({ where: { id }, select: { branchId: true } });
  if (!o || o.branchId !== me.branchId) throw new Error("Bu siparişe erişim yetkiniz yok");
}

export async function updateOrderStatus(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertOrderAccess(id, me);
  const status = (formData.get("status") as string) || "new";
  // Teslim edilince zaman damgala; teslimden çıkınca temizle (yanlış işaretleme düzelir)
  const data: { status: string; deliveredAt?: Date | null } = { status };
  if (status === "delivered") {
    const existing = await prisma.order.findUnique({ where: { id }, select: { deliveredAt: true } });
    if (existing && !existing.deliveredAt) data.deliveredAt = new Date();
  } else {
    data.deliveredAt = null;
  }
  await prisma.order.update({ where: { id }, data });
  revalidatePath("/admin/siparisler");
}

export async function deleteOrder(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertOrderAccess(id, me);
  await prisma.order.delete({ where: { id } });
  revalidatePath("/admin/siparisler");
}

export async function assignCourier(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertOrderAccess(id, me);
  const courierId = (formData.get("courierId") as string) || null;

  if (courierId && me.role !== "HQ_ADMIN") {
    const cc = await prisma.courier.findUnique({ where: { id: courierId }, select: { branchId: true } });
    if (!cc || cc.branchId !== me.branchId) throw new Error("Bu kurye sizin şubenize ait değil");
  }

  const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  // Atama yapılıyorsa ve durum erken aşamadaysa otomatik "Hazırlanıyor"
  const bump = courierId && order && (order.status === "new" || order.status === "confirmed");

  await prisma.order.update({
    where: { id },
    data: {
      courierId,
      assignedAt: courierId ? new Date() : null,
      ...(bump ? { status: "preparing" } : {}),
    },
  });
  revalidatePath("/admin/siparisler");
}

export async function assignOrderBranch(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const branchId = (formData.get("branchId") as string) || null;
  await prisma.order.update({ where: { id }, data: { branchId } });
  revalidatePath("/admin/siparisler");
}
