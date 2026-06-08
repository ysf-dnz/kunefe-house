"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Item = { id: string; slug: string; title: Record<string, string> | null; primaryImageUrl: string | null };

export function FeaturedSlider({ items, locale, heading }: { items: Item[]; locale: Locale; heading: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">Öne Çıkanlar</span>
      </div>
      <h2 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{heading}</h2>
      <div className="mx-auto mt-5 mb-12 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="flex snap-x gap-6 overflow-x-auto pb-4">
        {items.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="w-64 shrink-0 snap-start">
            <Link href={`/lezzetlerimiz/${p.slug}`} className="card-premium group block overflow-hidden rounded-2xl">
              <div className="relative aspect-square overflow-hidden">
                {p.primaryImageUrl && (
                  <Image src={p.primaryImageUrl} alt={localize(p.title, locale)} fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent" />
              </div>
              <p className="p-4 text-center font-serif text-gold-gradient">{localize(p.title, locale)}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
