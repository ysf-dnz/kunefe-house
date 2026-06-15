"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { deleteImageByUrl } from "@/lib/storage";

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function updateMapImage(formData: FormData) {
  await requireHQ();
  const mapImageUrl = (formData.get("mapImageUrl") as string) || null;
  const mapTitle = readLocalized(formData, "mapTitle");
  const mapDescription = readLocalized(formData, "mapDescription");
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { mapImageUrl, mapTitle, mapDescription },
    create: { id: 1, mapImageUrl, mapTitle, mapDescription },
  });
  revalidatePath("/admin/harita");
}

export async function createPin(formData: FormData) {
  await requireHQ();
  const cityName = (formData.get("cityName") as string) || "";
  const x = parseFloat((formData.get("x") as string) || "0");
  const y = parseFloat((formData.get("y") as string) || "0");
  if (!cityName.trim()) throw new Error("Şehir adı zorunlu");
  const count = await prisma.mapPin.count();
  await prisma.mapPin.create({
    data: {
      cityName,
      x,
      y,
      ingredient: readLocalized(formData, "ingredient"),
      popupTitle: readLocalized(formData, "popupTitle"),
      popupBody: readLocalized(formData, "popupBody"),
      popupMediaUrl: (formData.get("popupMediaUrl") as string) || null,
      order: count,
    },
  });
  revalidatePath("/admin/harita");
}

export async function deletePin(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const pin = await prisma.mapPin.findUnique({ where: { id } });
  if (pin?.popupMediaUrl) await deleteImageByUrl(pin.popupMediaUrl);
  await prisma.mapPin.delete({ where: { id } });
  revalidatePath("/admin/harita");
}
