"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import { calcShipping, type ShippingConfig } from "@/lib/shipping";
import { formatPrice } from "@/lib/price";

export function CartView({ shipping }: { shipping: ShippingConfig }) {
  const t = useTranslations("cart");
  const { items, setQty, remove, subtotal } = useCart();

  if (items.length === 0) {
    return <p className="text-center text-cream/60">{t("empty")}</p>;
  }
  const fee = calcShipping(subtotal, shipping);
  const total = subtotal + fee;

  return (
    <div className="mx-auto max-w-2xl">
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i.productId} className="card-premium flex items-center gap-4 rounded-xl p-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-forest">
              {i.imageUrl && <Image src={i.imageUrl} alt={i.title} fill className="object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-cream">{i.title}</p>
              <p className="text-sm text-gold">{formatPrice(i.price, "TRY")}</p>
            </div>
            <input type="number" min={1} max={99} value={i.qty}
              onChange={(e) => setQty(i.productId, Number(e.target.value))}
              className="w-16 rounded border border-copper/40 bg-forest px-2 py-1 text-center text-cream" />
            <button type="button" onClick={() => remove(i.productId)} className="text-sm text-red-400">{t("remove")}</button>
          </li>
        ))}
      </ul>

      <div className="card-premium mt-6 flex flex-col gap-2 rounded-xl p-5">
        <div className="flex justify-between text-cream/80"><span>{t("subtotal")}</span><span>{formatPrice(subtotal, "TRY")}</span></div>
        <div className="flex justify-between text-cream/80"><span>{t("shipping")}</span><span>{fee === 0 ? t("free") : formatPrice(fee, "TRY")}</span></div>
        <div className="flex justify-between border-t border-copper/30 pt-2 text-lg font-semibold text-gold"><span>{t("total")}</span><span>{formatPrice(total, "TRY")}</span></div>
        <Link href="/odeme" className="btn-gold mt-3 rounded-full px-6 py-3 text-center text-sm font-semibold">{t("checkout")}</Link>
      </div>
    </div>
  );
}
