"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function createCategory(formData: FormData) {
  await requireHQ();
  const tr = (formData.get("name.tr") as string) ?? "";
  const en = (formData.get("name.en") as string) ?? "";
  const ar = (formData.get("name.ar") as string) ?? "";
  if (!tr.trim()) throw new Error("Türkçe ad zorunlu");
  await prisma.productCategory.create({ data: { name: { tr, en, ar }, slug: slugify(tr) } });
  revalidatePath("/admin/kategoriler");
}

export async function deleteCategory(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  await prisma.productCategory.delete({ where: { id } });
  revalidatePath("/admin/kategoriler");
}
