"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Pin = {
  id: string;
  cityName: string;
  x: number;
  y: number;
  ingredient: Record<string, string> | null;
  popupTitle: Record<string, string> | null;
  popupBody: Record<string, string> | null;
  popupMediaUrl: string | null;
};

export function InteractiveMap({ mapImageUrl, pins, locale }: { mapImageUrl: string; pins: Pin[]; locale: Locale }) {
  const [active, setActive] = useState<Pin | null>(null);

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="relative aspect-[4/3] w-full">
        <Image src={mapImageUrl} alt="Malzeme haritası" fill className="object-contain" priority />

        {pins.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={p.cityName}
          >
            {/* Nabız halkası */}
            <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-gold/40" />
            <span className="relative block h-4 w-4 rounded-full bg-gradient-to-br from-gold-light to-copper ring-2 ring-cream/80 transition-transform group-hover:scale-125" />
            <span className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-forest-deep/90 px-2 py-0.5 text-[11px] text-cream opacity-0 transition-opacity group-hover:opacity-100">
              {p.cityName}
            </span>
          </button>
        ))}
      </div>

      {/* Popup */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-deep/70 p-4 backdrop-blur-sm"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="card-premium w-full max-w-md overflow-hidden rounded-2xl"
            >
              {active.popupMediaUrl && (
                <div className="relative aspect-video w-full">
                  <Image src={active.popupMediaUrl} alt="" fill className="object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/80 to-transparent" />
                </div>
              )}
              <div className="p-6">
                <span className="text-xs uppercase tracking-[0.2em] text-copper">{active.cityName}</span>
                <h3 className="mt-1 font-serif text-2xl text-gold-gradient">
                  {localize(active.popupTitle, locale) || localize(active.ingredient, locale)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cream/80">
                  {localize(active.popupBody, locale)}
                </p>
                <button onClick={() => setActive(null)}
                  className="btn-outline-gold mt-5 rounded-full px-5 py-2 text-sm">
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
