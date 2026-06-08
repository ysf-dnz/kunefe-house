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
      <Link href={`/lezzetlerimiz/${slug}`} className="group block overflow-hidden rounded-lg bg-forest-light">
        <div className="relative aspect-square overflow-hidden">
          {primaryImageUrl && (
            <Image src={primaryImageUrl} alt={localize(title, locale)} fill
              className="object-cover transition-opacity duration-500 group-hover:opacity-0" />
          )}
          {secondaryImageUrl && (
            <Image src={secondaryImageUrl} alt="" fill
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
        </div>
        <div className="p-4">
          <h3 className="font-serif text-lg text-gold">{localize(title, locale)}</h3>
          <p className="mt-1 text-sm text-cream/70">{localize(shortDescription, locale)}</p>
        </div>
      </Link>
    </motion.div>
  );
}
