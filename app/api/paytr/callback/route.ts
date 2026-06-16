import { prisma } from "@/lib/prisma";
import { verifyCallback } from "@/lib/paytr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.PAYTR_MERCHANT_KEY;
  const salt = process.env.PAYTR_MERCHANT_SALT;
  if (!key || !salt) return new Response("PAYTR not configured", { status: 500 });

  const form = await req.formData();
  const post = {
    merchant_oid: String(form.get("merchant_oid") ?? ""),
    status: String(form.get("status") ?? ""),
    total_amount: String(form.get("total_amount") ?? ""),
    hash: String(form.get("hash") ?? ""),
  };

  if (!verifyCallback(post, key, salt)) return new Response("BAD HASH", { status: 400 });

  const order = await prisma.shopOrder.findUnique({
    where: { merchantOid: post.merchant_oid },
    include: { items: true },
  });
  // Sipariş yoksa bile PayTR'a OK dön (tekrar denemesin)
  if (!order) return new Response("OK");
  // Idempotent: zaten işlenmişse tekrar düşme
  if (order.status !== "pending_payment") return new Response("OK");

  if (post.status === "success") {
    await prisma.$transaction(async (tx) => {
      await tx.shopOrder.update({
        where: { id: order.id },
        data: { status: "paid", paytrStatus: post.status, paidAt: new Date() },
      });
      // Takipli ürünlerde stok düş (negatife düşürmeden)
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.updateMany({
          where: { id: it.productId, cargoStock: { gte: it.qty } },
          data: { cargoStock: { decrement: it.qty } },
        });
      }
    });
  } else {
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: { status: "cancelled", paytrStatus: post.status },
    });
  }

  return new Response("OK");
}
