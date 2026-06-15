"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";


function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function createBranch(formData: FormData) {
  await requireHQ();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) throw new Error("Şube adı zorunlu");
  const count = await prisma.branch.count();
  await prisma.branch.create({
    data: {
      name,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      isActive: formData.get("isActive") !== "off",
      lat: formData.get("lat") ? Number(formData.get("lat")) : null,
      lng: formData.get("lng") ? Number(formData.get("lng")) : null,
      mapsEmbedUrl: (formData.get("mapsEmbedUrl") as string) || null,
      address: readLocalized(formData, "address"),
      workingHours: readLocalized(formData, "workingHours"),
      order: count,
    },
  });
  revalidatePath("/admin/subeler");
}

export async function deleteBranch(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  await prisma.branch.delete({ where: { id } });
  revalidatePath("/admin/subeler");
}
