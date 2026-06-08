"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function createBranch(formData: FormData) {
  await guard();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) throw new Error("Şube adı zorunlu");
  const count = await prisma.branch.count();
  await prisma.branch.create({
    data: {
      name,
      phone: (formData.get("phone") as string) || null,
      mapsEmbedUrl: (formData.get("mapsEmbedUrl") as string) || null,
      address: readLocalized(formData, "address"),
      workingHours: readLocalized(formData, "workingHours"),
      order: count,
    },
  });
  revalidatePath("/admin/subeler");
}

export async function deleteBranch(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.branch.delete({ where: { id } });
  revalidatePath("/admin/subeler");
}
