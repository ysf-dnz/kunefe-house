"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n-field";
import { buildEtaMessage } from "@/lib/eta-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";

export function EtaButton({ number, locale, label }: { number: string; locale: Locale; label: string }) {
  const t = useTranslations("eta");
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locState, setLocState] = useState<"idle" | "ok" | "fail">("idle");
  const [addressNote, setAddressNote] = useState("");

  function shareLocation() {
    if (!navigator.geolocation) { setLocState("fail"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocState("ok"); },
      () => setLocState("fail"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function ask(withLocation: boolean) {
    const locationUrl = withLocation && lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const message = buildEtaMessage({ locationUrl, addressNote: withLocation ? addressNote : null, locale });
    window.open(buildWhatsAppHref(number, message), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label}
        className="fixed bottom-6 end-6 z-50 transition-transform hover:scale-110">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fistik.svg" alt={label} className="h-16 w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
            role="dialog" aria-modal="true" aria-label={t("title")}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="card-premium w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl">
              <div className="mb-4 flex items-center gap-3">
                <motion.span
                  className="text-3xl"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  aria-hidden="true">🛵</motion.span>
                <h3 className="font-serif text-xl text-gold-gradient">{t("title")}</h3>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("close")}
                  className="ms-auto text-cream/50 hover:text-cream">✕</button>
              </div>
              <p className="mb-4 text-sm text-cream/70">{t("subtitle")}</p>

              <button type="button" onClick={shareLocation}
                className={`mb-3 w-full rounded-lg border px-4 py-2.5 text-sm ${locState === "ok" ? "border-green-400/60 text-green-400" : "border-gold/50 text-gold hover:bg-gold/10"}`}>
                {locState === "ok" ? t("locationReceived") : `📍 ${t("shareLocation")}`}
              </button>
              {locState === "fail" && <p className="mb-3 text-xs text-amber-400">{t("locationFailed")}</p>}

              <input value={addressNote} onChange={(e) => setAddressNote(e.target.value)} maxLength={200}
                placeholder={t("addressNote")}
                className="mb-4 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />

              <button type="button" onClick={() => ask(true)}
                className="btn-gold w-full rounded-full px-4 py-3 text-sm font-semibold">
                {t("ask")}
              </button>
              <button type="button" onClick={() => ask(false)}
                className="mt-2 w-full text-center text-xs text-cream/50 underline-offset-2 hover:underline">
                {t("askWithoutLocation")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
