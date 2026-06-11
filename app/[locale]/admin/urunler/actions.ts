"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
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
function parseIngredients(raw: string) {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}
function parsePrice(form: FormData, name: string): number | null {
  const raw = ((form.get(name) as string) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export async function createProduct(formData: FormData) {
  await guard();
  const title = readLocalized(formData, "title");
  if (!title.tr.trim()) throw new Error("Türkçe başlık zorunlu");
  // Boş slug (örn. yalnız özel karakter) ve aynı isimli ürün çakışmasına karşı koruma
  const base = slugify(title.tr) || "urun";
  const existing = await prisma.product.findUnique({ where: { slug: base }, select: { id: true } });
  const slug = existing ? `${base}-${Date.now().toString(36)}` : base;
  await prisma.product.create({
    data: {
      title,
      slug,
      shortDescription: readLocalized(formData, "shortDescription"),
      ingredients: parseIngredients((formData.get("ingredients") as string) ?? ""),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
      price: parsePrice(formData, "price"),
      oldPrice: parsePrice(formData, "oldPrice"),
      showPrice: formData.get("showPrice") === "on",
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function updateProduct(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const title = readLocalized(formData, "title");
  await prisma.product.update({
    where: { id },
    data: {
      title,
      shortDescription: readLocalized(formData, "shortDescription"),
      ingredients: parseIngredients((formData.get("ingredients") as string) ?? ""),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
      price: parsePrice(formData, "price"),
      oldPrice: parsePrice(formData, "oldPrice"),
      showPrice: formData.get("showPrice") === "on",
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function deleteProduct(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const product = await prisma.product.findUnique({ where: { id } });
  if (product?.primaryImageUrl) await deleteImageByUrl(product.primaryImageUrl);
  if (product?.secondaryImageUrl) await deleteImageByUrl(product.secondaryImageUrl);
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/urunler");
}
