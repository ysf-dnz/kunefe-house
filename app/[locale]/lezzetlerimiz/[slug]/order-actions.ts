"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parsePortions } from "@/lib/portions";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export type OrderState = { ok?: boolean };

const clamp = (v: FormDataEntryValue | null, max: number) =>
  (typeof v === "string" ? v : "").trim().slice(0, max);

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(typeof v === "string" ? v.trim() : NaN);
  return Number.isFinite(n) ? n : null;
}

/**
 * Public sipariş kaydı (müşteri auth'suz çağırır). Best-effort:
 * herhangi bir hata sessizce yutulur; istemci her durumda WhatsApp'ı açar.
 */
export async function createOrder(formData: FormData): Promise<OrderState> {
  try {
    if (clamp(formData.get("website"), 100)) return { ok: true };
    // Rate-limit: IP başına 5 sipariş / dk (fail-open; aşılırsa sessizce yut — best-effort)
    if (!(await checkRateLimit("order", clientIp(await headers())))) return { ok: true };

    const productId = clamp(formData.get("productId"), 64) || null;
    const productTitle = clamp(formData.get("productTitle"), 200) || "—";
    const customerName = clamp(formData.get("customerName"), 120) || null;
    const customerPhone = clamp(formData.get("customerPhone"), 32) || null;
    const addressNote = clamp(formData.get("addressNote"), 1000) || null;
    const note = clamp(formData.get("note"), 1000) || null;

    // Zorunlu alanlar sunucu tarafında da doğrulanır (istemci atlatılabilir): eksikse sessizce yut.
    if (!customerName || !addressNote) return { ok: true };
    if (!customerPhone || (customerPhone.match(/\d/g)?.length ?? 0) < 10) return { ok: true };

    let persons = num(formData.get("persons"));
    if (persons !== null) persons = Math.round(persons);
    if (persons !== null && (persons <= 0 || persons > 1000)) persons = null;

    let lat = num(formData.get("lat"));
    let lng = num(formData.get("lng"));
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      lat = null;
      lng = null;
    }
    const locationUrl = lat !== null && lng !== null ? `https://maps.google.com/?q=${lat},${lng}` : null;

    let price: number | null = null;
    if (productId && persons !== null) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { portions: true, price: true },
      });
      if (product) {
        const portions = parsePortions(JSON.stringify(product.portions ?? []));
        const match = portions.find((p) => p.persons === persons);
        if (match) price = match.price;
        else if (product.price != null) price = Number(product.price);
      }
    }

    await prisma.order.create({
      data: {
        productId,
        productTitle,
        persons,
        price,
        customerName,
        customerPhone,
        addressNote,
        note,
        locationUrl,
        lat,
        lng,
      },
    });
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
