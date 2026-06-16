"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import type { CartItem } from "@/lib/cart";

export function AddToCartButton({ item, soldOut }: { item: CartItem; soldOut?: boolean }) {
  const t = useTranslations("shop");
  const { add } = useCart();
  const [done, setDone] = useState(false);
  if (soldOut) {
    return <span className="rounded-full bg-cream/10 px-5 py-2 text-sm text-cream/40">{t("soldOut")}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => { add(item); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="btn-gold rounded-full px-5 py-2 text-sm font-semibold"
    >
      {done ? t("added") : t("addToCart")}
    </button>
  );
}
