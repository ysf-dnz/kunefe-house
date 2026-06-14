"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { localize, type Locale } from "@/lib/i18n-field";
import { formatPrice, discountPercent } from "@/lib/price";
import type { Portion } from "@/lib/portions";
import { currencyForLocale, productPriceForLocale, minPortionPriceForLocale } from "@/lib/currency";

export function ProductCard({ slug, title, shortDescription, primaryImageUrl, secondaryImageUrl, locale, price, oldPrice, showPrice, portions, priceUsd, oldPriceUsd, priceQar, oldPriceQar }: {
  slug: string;
  title: Record<string, string> | null;
  shortDescription: Record<string, string> | null;
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
  locale: Locale;
  price?: number | null;
  oldPrice?: number | null;
  showPrice?: boolean;
  portions?: Portion[] | null;
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
}) {
  const t = useTranslations("order");
  const currency = currencyForLocale(locale);
  const portionList = portions ?? [];
  const single = productPriceForLocale({ price, oldPrice, priceUsd, oldPriceUsd, priceQar, oldPriceQar }, locale);
  const fromPrice = portionList.length > 0 ? minPortionPriceForLocale(portionList, locale) : null;
  const cardPrice = fromPrice != null ? fromPrice : single.price;
  const cardOldPrice = fromPrice != null ? null : single.oldPrice;
  const priceVisible = showPrice && cardPrice != null;
  const discount = priceVisible ? discountPercent(cardPrice, cardOldPrice) : null;
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
          {discount != null && (
            <span className="absolute start-3 top-3 rounded-full bg-copper px-2.5 py-1 text-xs font-bold text-cream shadow-lg">
              %{discount} İNDİRİM
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-serif text-lg text-gold-gradient">{localize(title, locale)}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{localize(shortDescription, locale)}</p>
          {priceVisible && (
            <div className="mt-3 flex items-baseline gap-2">
              {fromPrice != null ? (
                <span className="font-serif text-lg text-gold">{t("fromPrice", { price: formatPrice(fromPrice, currency, locale) ?? "" })}</span>
              ) : (
                <>
                  <span className="font-serif text-lg text-gold">{formatPrice(cardPrice, currency, locale)}</span>
                  {cardOldPrice != null && cardOldPrice > (cardPrice ?? 0) && (
                    <span className="text-sm text-cream/40 line-through">{formatPrice(cardOldPrice, currency, locale)}</span>
                  )}
                </>
              )}
            </div>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-copper transition-all group-hover:gap-2 group-hover:text-gold">
            İncele →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
