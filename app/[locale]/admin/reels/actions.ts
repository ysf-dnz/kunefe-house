"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteImageByUrl } from "@/lib/storage";

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

export async function createReel(formData: FormData) {
  await guard();
  const coverUrl = (formData.get("coverUrl") as string) || null;
  const videoUrl = (formData.get("videoUrl") as string) || null;
  const instagramUrl = (formData.get("instagramUrl") as string) || null;
  // En az biri gerekli: video, kapak görseli veya Instagram linki
  if (!coverUrl && !videoUrl && !instagramUrl) {
    throw new Error("Video, kapak görseli veya Instagram linkinden en az biri gerekli");
  }
  const count = await prisma.reel.count();
  await prisma.reel.create({
    data: {
      title: readLocalized(formData, "title"),
      coverUrl, // opsiyonel; yoksa ReelsStrip markalı placeholder gösterir
      videoUrl,
      instagramUrl,
      order: count,
    },
  });
  revalidatePath("/admin/reels");
}

export async function deleteReel(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const reel = await prisma.reel.findUnique({ where: { id } });
  if (reel?.coverUrl) await deleteImageByUrl(reel.coverUrl);
  if (reel?.videoUrl) await deleteImageByUrl(reel.videoUrl);
  await prisma.reel.delete({ where: { id } });
  revalidatePath("/admin/reels");
}

export async function setReelProducts(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const productIds = (formData.getAll("productIds") as string[]).filter(Boolean);
  await prisma.reel.update({
    where: { id },
    data: { products: { set: productIds.map((pid) => ({ id: pid })) } },
  });
  revalidatePath("/admin/reels");
  revalidatePath("/admin/urunler");
}
