"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Item = { id: string; slug: string; title: Record<string, string> | null; primaryImageUrl: string | null };

export function FeaturedSlider({ items, locale, heading }: { items: Item[]; locale: Locale; heading: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-8 text-center font-serif text-3xl text-gold">{heading}</h2>
      <div className="flex snap-x gap-6 overflow-x-auto pb-4">
        {items.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="w-64 shrink-0 snap-start">
            <Link href={`/lezzetlerimiz/${p.slug}`} className="group block overflow-hidden rounded-lg bg-forest-light">
              <div className="relative aspect-square overflow-hidden">
                {p.primaryImageUrl && (
                  <Image src={p.primaryImageUrl} alt={localize(p.title, locale)} fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
              </div>
              <p className="p-3 text-center font-serif text-gold">{localize(p.title, locale)}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
