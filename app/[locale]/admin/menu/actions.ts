"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function saveBranchProduct(formData: FormData) {
  const me = await requireAdmin();
  if (me.role !== "BRANCH_ADMIN" || !me.branchId) throw new Error("Yalnız şube yöneticisi");
  const branchId = me.branchId;
  const productId = formData.get("productId") as string;
  if (!productId) throw new Error("Ürün gerekli");

  const available = formData.get("available") === "on";

  const stockRaw = ((formData.get("stock") as string) ?? "").trim();
  let stock: number | null = null;
  if (stockRaw !== "") {
    const n = Math.round(Number(stockRaw));
    stock = Number.isFinite(n) && n >= 0 ? n : null;
  }

  const lpRaw = ((formData.get("localPrice") as string) ?? "").trim().replace(",", ".");
  let localPrice: number | null = null;
  if (lpRaw !== "") {
    const n = Number(lpRaw);
    localPrice = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }

  if (available && stock === null && localPrice === null) {
    await prisma.branchProduct.deleteMany({ where: { branchId, productId } });
  } else {
    await prisma.branchProduct.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: { available, stock, localPrice },
      create: { branchId, productId, available, stock, localPrice },
    });
  }
  revalidatePath("/admin/menu");
}
