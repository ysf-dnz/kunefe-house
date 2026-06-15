"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireHQ } from "@/lib/require-admin";

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

export async function createUser(formData: FormData) {
  await requireHQ();
  const email = clamp(formData.get("email"), 160).toLowerCase();
  const name = clamp(formData.get("name"), 120);
  const role = formData.get("role") === "HQ_ADMIN" ? "HQ_ADMIN" : "BRANCH_ADMIN";
  const branchId = (formData.get("branchId") as string) || null;
  const password = clamp(formData.get("password"), 200);
  if (!email || !name || password.length < 6) throw new Error("E-posta, ad ve en az 6 haneli şifre zorunlu");
  if (role === "BRANCH_ADMIN" && !branchId) throw new Error("Şube yöneticisi için şube seçilmeli");
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, role, branchId: role === "HQ_ADMIN" ? null : branchId, passwordHash },
  });
  revalidatePath("/admin/kullanicilar");
}

export async function resetPassword(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const password = clamp(formData.get("password"), 200);
  if (password.length < 6) throw new Error("Şifre en az 6 hane");
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/admin/kullanicilar");
}

export async function toggleUserActive(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const next = formData.get("value") === "true";
  await prisma.user.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/kullanicilar");
}

export async function deleteUser(formData: FormData) {
  const me = await requireHQ();
  const id = formData.get("id") as string;
  if (id === me.id) throw new Error("Kendi hesabını silemezsin");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/kullanicilar");
}
