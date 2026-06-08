"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

export async function createCategory(formData: FormData) {
  await guard();
  const tr = (formData.get("name.tr") as string) ?? "";
  const en = (formData.get("name.en") as string) ?? "";
  const ar = (formData.get("name.ar") as string) ?? "";
  if (!tr.trim()) throw new Error("Türkçe ad zorunlu");
  await prisma.productCategory.create({ data: { name: { tr, en, ar }, slug: slugify(tr) } });
  revalidatePath("/admin/kategoriler");
}

export async function deleteCategory(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.productCategory.delete({ where: { id } });
  revalidatePath("/admin/kategoriler");
}
