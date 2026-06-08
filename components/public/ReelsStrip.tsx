"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Reel = {
  id: string;
  title: Record<string, string> | null;
  coverUrl: string;
  instagramUrl: string;
};

export function ReelsStrip({ reels, locale, heading }: { reels: Reel[]; locale: Locale; heading: string }) {
  if (reels.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">@kunefehouse</span>
      </div>
      <h2 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{heading}</h2>
      <div className="mx-auto mt-5 mb-12 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="flex snap-x gap-5 overflow-x-auto pb-4">
        {reels.map((r, i) => (
          <motion.a
            key={r.id}
            href={r.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group w-44 shrink-0 snap-start"
          >
            {/* Story-ring: altın gradyan halka */}
            <div className="rounded-2xl bg-gradient-to-br from-gold via-copper to-gold p-[2px] transition-transform duration-500 group-hover:scale-[1.03]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-forest-deep">
                <Image src={r.coverUrl} alt={localize(r.title, locale)} fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-transparent to-transparent" />
                {/* Oynat ikonu */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/15 backdrop-blur-sm transition-all group-hover:bg-gold/80">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-cream group-hover:fill-forest-deep" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                {localize(r.title, locale) && (
                  <p className="absolute inset-x-0 bottom-0 p-3 text-sm font-medium text-cream">
                    {localize(r.title, locale)}
                  </p>
                )}
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
