"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function createCourier(formData: FormData) {
  await guard();
  const name = clamp(formData.get("name"), 120);
  const phone = clamp(formData.get("phone"), 32);
  const vehicle = clamp(formData.get("vehicle"), 60) || null;
  const note = clamp(formData.get("note"), 500) || null;
  if (!name || !phone) throw new Error("Ad ve telefon zorunlu");
  await prisma.courier.create({ data: { name, phone, vehicle, note, token: randomUUID() } });
  revalidatePath("/admin/kuryeler");
}

export async function toggleAvailability(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isAvailable: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function toggleActive(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.courier.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function deleteCourier(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.courier.delete({ where: { id } });
  revalidatePath("/admin/kuryeler");
  revalidatePath("/admin/siparisler");
}

export async function ensureCourierToken(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const c = await prisma.courier.findUnique({ where: { id }, select: { token: true } });
  if (c && !c.token) {
    await prisma.courier.update({ where: { id }, data: { token: randomUUID() } });
  }
  revalidatePath("/admin/kuryeler");
}
