"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

export function ProductCard({ slug, title, shortDescription, primaryImageUrl, secondaryImageUrl, locale }: {
  slug: string;
  title: Record<string, string> | null;
  shortDescription: Record<string, string> | null;
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
  locale: Locale;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <Link href={`/lezzetlerimiz/${slug}`} className="card-premium group block overflow-hidden rounded-2xl">
        <div className="relative aspect-square overflow-hidden">
          {primaryImageUrl && (
            <Image src={primaryImageUrl} alt={localize(title, locale)} fill
              className="object-cover transition-all duration-700 group-hover:scale-105 group-hover:opacity-0" />
          )}
          {secondaryImageUrl && (
            <Image src={secondaryImageUrl} alt="" fill
              className="object-cover opacity-0 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100" />
          )}
          {/* Alt gradyan — metin okunurluğu + premium his */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent" />
        </div>
        <div className="p-5">
          <h3 className="font-serif text-lg text-gold-gradient">{localize(title, locale)}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{localize(shortDescription, locale)}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-copper transition-all group-hover:gap-2 group-hover:text-gold">
            İncele →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
