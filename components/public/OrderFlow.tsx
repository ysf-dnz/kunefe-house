"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n-field";
import type { Portion } from "@/lib/portions";
import { portionLabel } from "@/lib/portions";
import { formatPrice, discountPercent } from "@/lib/price";
import { buildOrderMessage } from "@/lib/order-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { createOrder } from "@/app/[locale]/lezzetlerimiz/[slug]/order-actions";

type Props = {
  productId: string;
  productName: string;
  locale: Locale;
  whatsappNumber: string | null;
  showPrice: boolean;
  portions: Portion[];
  singlePrice: number | null;
  singleOldPrice: number | null;
};

export function OrderFlow({
  productId, productName, locale, whatsappNumber, showPrice, portions, singlePrice, singleOldPrice,
}: Props) {
  const t = useTranslations("order");
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locState, setLocState] = useState<"idle" | "ok" | "fail">("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressNote, setAddressNote] = useState("");
  const [note, setNote] = useState("");

  const hasPortions = portions.length > 0;
  const activePortion = hasPortions ? portions[selected] : null;
  const price = hasPortions ? activePortion!.price : singlePrice;
  const oldPrice = hasPortions ? activePortion?.oldPrice ?? null : singleOldPrice;
  const persons = activePortion?.persons ?? 1;
  const discount = showPrice ? discountPercent(price, oldPrice) : null;
  const priceText = showPrice && price != null ? formatPrice(price, locale) : null;

  const valid = name.trim() && (phone.match(/\d/g)?.length ?? 0) >= 10 && addressNote.trim();

  function shareLocation() {
    if (!navigator.geolocation) { setLocState("fail"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocState("ok"); },
      () => setLocState("fail"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const waHref = useMemo(() => {
    if (!whatsappNumber) return null;
    const locationUrl = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const message = buildOrderMessage({
      productName, persons, priceText, customerName: name, customerPhone: phone,
      addressNote, note, locationUrl, locale,
    });
    return buildWhatsAppHref(whatsappNumber, message);
  }, [whatsappNumber, lat, lng, productName, persons, priceText, name, phone, addressNote, note, locale]);

  async function submit() {
    if (!valid || !waHref) return;
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("productTitle", productName);
    fd.set("persons", String(persons));
    fd.set("customerName", name);
    fd.set("customerPhone", phone);
    fd.set("addressNote", addressNote);
    fd.set("note", note);
    if (lat != null && lng != null) { fd.set("lat", String(lat)); fd.set("lng", String(lng)); }
    try { await createOrder(fd); } catch { /* best-effort */ }
    window.open(waHref, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="mt-6">
      {hasPortions && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-cream/70">{t("selectPortion")}</p>
          <div className="flex flex-wrap gap-2">
            {portions.map((p, i) => (
              <button key={p.persons} type="button" onClick={() => setSelected(i)}
                className={`rounded-full px-4 py-1.5 text-sm transition-all ${i === selected ? "pill-gold" : "btn-outline-gold"}`}>
                {portionLabel(p.persons, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      {priceText && (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-serif text-3xl text-gold">{priceText}</span>
          {oldPrice != null && oldPrice > (price ?? 0) && (
            <span className="text-lg text-cream/40 line-through">{formatPrice(oldPrice, locale)}</span>
          )}
          {discount != null && (
            <span className="rounded-full bg-copper px-2.5 py-1 text-xs font-bold text-cream">%{discount} İNDİRİM</span>
          )}
        </div>
      )}

      {whatsappNumber && (
        <button type="button" onClick={() => setOpen(true)}
          className="btn-gold rounded-full px-7 py-3 text-sm font-semibold">
          {t("orderButton")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}>
          <div className="card-premium w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-serif text-xl text-gold-gradient">{productName}{hasPortions ? ` · ${portionLabel(persons, locale)}` : ""}</h3>

            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />

            <button type="button" onClick={shareLocation}
              className={`mb-3 w-full rounded-lg border px-4 py-2.5 text-sm ${locState === "ok" ? "border-green-400/60 text-green-400" : "border-gold/50 text-gold hover:bg-gold/10"}`}>
              {locState === "ok" ? t("locationReceived") : `📍 ${t("shareLocation")}`}
            </button>
            {locState === "fail" && <p className="mb-3 text-xs text-red-400">{t("locationFailed")}</p>}

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")}
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone")} inputMode="tel"
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <textarea value={addressNote} onChange={(e) => setAddressNote(e.target.value)} placeholder={t("addressNote")} rows={2}
              className="mb-3 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("extraNote")} rows={2}
              className="mb-4 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />

            {!valid && <p className="mb-3 text-xs text-cream/50">{t("requiredHint")}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-cream/30 px-4 py-2.5 text-sm text-cream/70">
                {t("cancel")}
              </button>
              <button type="button" onClick={submit} disabled={!valid}
                className="btn-gold flex-[2] rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {t("send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
