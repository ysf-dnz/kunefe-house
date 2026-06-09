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

export async function createNews(formData: FormData) {
  await guard();
  const title = readLocalized(formData, "title");
  if (!title.tr.trim()) throw new Error("Başlık (TR) zorunlu");
  // Aynı anda tek popup: yeni popup işaretlenmişse diğerlerini kapat
  const asPopup = formData.get("asPopup") === "on";
  if (asPopup) await prisma.news.updateMany({ data: { asPopup: false } });
  await prisma.news.create({
    data: {
      title,
      body: readLocalized(formData, "body"),
      imageUrl: (formData.get("imageUrl") as string) || null,
      published: formData.get("published") === "on",
      asPopup,
    },
  });
  revalidatePath("/admin/haberler");
}

export async function deleteNews(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const news = await prisma.news.findUnique({ where: { id } });
  if (news?.imageUrl) await deleteImageByUrl(news.imageUrl);
  await prisma.news.delete({ where: { id } });
  revalidatePath("/admin/haberler");
}
