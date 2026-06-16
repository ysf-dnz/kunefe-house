"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHQ } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { deleteImageByUrl } from "@/lib/storage";
import { parsePortions } from "@/lib/portions";

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
function readLocalizedIngredients(form: FormData) {
  return {
    tr: parseIngredients((form.get("ingredients.tr") as string) ?? ""),
    en: parseIngredients((form.get("ingredients.en") as string) ?? ""),
    ar: parseIngredients((form.get("ingredients.ar") as string) ?? ""),
  };
}
function parseStock(form: FormData): number | null {
  const raw = ((form.get("cargoStock") as string) ?? "").trim();
  if (!raw) return null;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function parsePrice(form: FormData, name: string): number | null {
  const raw = ((form.get(name) as string) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export async function createProduct(formData: FormData) {
  await requireHQ();
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
      ingredients: readLocalizedIngredients(formData),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
      price: parsePrice(formData, "price"),
      oldPrice: parsePrice(formData, "oldPrice"),
      showPrice: formData.get("showPrice") === "on",
      portions: parsePortions(formData.get("portions") as string),
      priceUsd: parsePrice(formData, "priceUsd"),
      oldPriceUsd: parsePrice(formData, "oldPriceUsd"),
      priceQar: parsePrice(formData, "priceQar"),
      oldPriceQar: parsePrice(formData, "oldPriceQar"),
      cargoAvailable: formData.get("cargoAvailable") === "on",
      cargoStock: parseStock(formData),
      reels: { connect: (formData.getAll("reelIds") as string[]).filter(Boolean).map((id) => ({ id })) },
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function updateProduct(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const title = readLocalized(formData, "title");
  await prisma.product.update({
    where: { id },
    data: {
      title,
      shortDescription: readLocalized(formData, "shortDescription"),
      ingredients: readLocalizedIngredients(formData),
      primaryImageUrl: (formData.get("primaryImageUrl") as string) || null,
      secondaryImageUrl: (formData.get("secondaryImageUrl") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      featured: formData.get("featured") === "on",
      price: parsePrice(formData, "price"),
      oldPrice: parsePrice(formData, "oldPrice"),
      showPrice: formData.get("showPrice") === "on",
      portions: parsePortions(formData.get("portions") as string),
      priceUsd: parsePrice(formData, "priceUsd"),
      oldPriceUsd: parsePrice(formData, "oldPriceUsd"),
      priceQar: parsePrice(formData, "priceQar"),
      oldPriceQar: parsePrice(formData, "oldPriceQar"),
      cargoAvailable: formData.get("cargoAvailable") === "on",
      cargoStock: parseStock(formData),
      reels: { set: (formData.getAll("reelIds") as string[]).filter(Boolean).map((id) => ({ id })) },
    },
  });
  revalidatePath("/admin/urunler");
  redirect("/admin/urunler");
}

export async function deleteProduct(formData: FormData) {
  await requireHQ();
  const id = formData.get("id") as string;
  const product = await prisma.product.findUnique({ where: { id } });
  if (product?.primaryImageUrl) await deleteImageByUrl(product.primaryImageUrl);
  if (product?.secondaryImageUrl) await deleteImageByUrl(product.secondaryImageUrl);
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/urunler");
}
