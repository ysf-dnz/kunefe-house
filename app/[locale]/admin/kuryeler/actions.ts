"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import type { SessionUser } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

async function assertCourierAccess(id: string, me: SessionUser) {
  if (me.role === "HQ_ADMIN") return;
  const c = await prisma.courier.findUnique({ where: { id }, select: { branchId: true } });
  if (!c || c.branchId !== me.branchId) throw new Error("Bu kuryeye erişim yetkiniz yok");
}

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function createCourier(formData: FormData) {
  const me = await requireAdmin();
  const name = clamp(formData.get("name"), 120);
  const phone = clamp(formData.get("phone"), 32);
  const vehicle = clamp(formData.get("vehicle"), 60) || null;
  const note = clamp(formData.get("note"), 500) || null;
  if (!name || !phone) throw new Error("Ad ve telefon zorunlu");
  await prisma.courier.create({
    data: {
      name, phone, vehicle, note, token: randomUUID(),
      branchId: me.role === "HQ_ADMIN" ? ((formData.get("branchId") as string) || null) : me.branchId,
    },
  });
  revalidatePath("/admin/kuryeler");
}

export async function toggleAvailability(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertCourierAccess(id, me);
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isAvailable: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function toggleActive(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertCourierAccess(id, me);
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function deleteCourier(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertCourierAccess(id, me);
  await prisma.courier.delete({ where: { id } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function ensureCourierToken(formData: FormData) {
  const me = await requireAdmin();
  const id = formData.get("id") as string;
  await assertCourierAccess(id, me);
  const c = await prisma.courier.findUnique({ where: { id }, select: { token: true } });
  if (c && !c.token) {
    await prisma.courier.update({ where: { id }, data: { token: randomUUID() } });
  }
  revalidatePath("/admin/kuryeler");
}
