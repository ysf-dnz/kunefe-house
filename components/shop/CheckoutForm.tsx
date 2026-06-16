"use client";

import { useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "./CartProvider";
import { PaytrFrame } from "./PaytrFrame";
import { startCheckout, type CheckoutState } from "@/app/[locale]/odeme/actions";

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const { items, clear } = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  useEffect(() => { if (state.iframeToken) clear(); }, [state.iframeToken, clear]);

  if (state.iframeToken) return <PaytrFrame token={state.iframeToken} />;

  return (
    <form action={action} className="mx-auto flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lines" value={JSON.stringify(items.map((i) => ({ productId: i.productId, qty: i.qty })))} />
      <input name="name" placeholder={t("name")} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="phone" placeholder={t("phone")} inputMode="tel" required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="email" type="email" placeholder={t("email")} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <div className="flex gap-3">
        <input name="city" placeholder={t("city")} required className="w-1/2 rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <input name="district" placeholder={t("district")} required className="w-1/2 rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <textarea name="address" placeholder={t("address")} rows={3} required className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="postal" placeholder={t("postal")} className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button disabled={pending || items.length === 0} className="btn-gold rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50">
        {pending ? t("processing") : t("pay")}
      </button>
    </form>
  );
}
