"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BranchPicker } from "./BranchPicker";
import { CartIcon } from "@/components/shop/CartIcon";

export function HeaderClient({ logoUrl, logoHeight = 60, branches = [], selectedBranchId = null, cargoEnabled = false, showFranchise = true, showIngredients = true, enabledLocales = ["tr", "en", "ar"] }: { logoUrl: string | null; logoHeight?: number; branches?: { id: string; name: string }[]; selectedBranchId?: string | null; cargoEnabled?: boolean; showFranchise?: boolean; showIngredients?: boolean; enabledLocales?: string[] }) {
  const t = useTranslations("nav");
  const ts = useTranslations("shop");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Histerezis: tek eşik olursa header küçülüp içerik kayınca scrollY eşik
    // civarında salınır ve header titrer. Açılma 48px / kapanma 8px ile geniş
    // ölü bölge bırakıp titreşimi önlüyoruz.
    const onScroll = () => setScrolled((prev) => (prev ? window.scrollY > 8 : window.scrollY > 48));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: t("home") },
    ...(showIngredients ? [{ href: "/malzemelerimiz", label: t("ingredients") }] : []),
    { href: "/lezzetlerimiz", label: t("menu") },
    ...(cargoEnabled ? [{ href: "/magaza", label: ts("title") }] : []),
    ...(showFranchise ? [{ href: "/bayilik", label: t("franchise") }] : []),
    { href: "/iletisim", label: t("contact") },
  ];

  return (
    <header
      className={`glass-forest sticky top-0 z-40 transition-all ${scrolled ? "py-2" : "py-4"}`}
    >
      <div className="flex items-center justify-between px-6">
        <Link href="/" className="font-serif text-xl tracking-wide text-cream">
          {logoUrl ? (
            <Image src={logoUrl} alt="Kunefe House" width={280} height={logoHeight}
              style={{ height: scrolled ? Math.round(logoHeight * 0.7) : logoHeight }}
              className="w-auto transition-all" priority />
          ) : (
            <>
              KUNEFE <span className="text-gold-gradient">HOUSE</span>
            </>
          )}
        </Link>

        <nav className="hidden gap-7 text-sm text-cream/90 md:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href}
              className="group relative transition-colors hover:text-gold">
              {item.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-gold to-copper transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          {cargoEnabled && <CartIcon href="/sepet" />}
          {/* Şube seç (müşteri tarafı) masaüstünde üstte; mobilde hamburger menüsünde */}
          <div className="hidden md:block">
            <BranchPicker branches={branches} selectedId={selectedBranchId} />
          </div>
          <LanguageSwitcher enabled={enabledLocales} />
          {/* Hamburger (mobil) */}
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu"
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden">
            <span className={`h-0.5 w-6 bg-gold transition-all ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-6 bg-gold transition-all ${open ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-6 bg-gold transition-all ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobil menü */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 pt-4">
              {links.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className="border-b border-copper/15 py-3 text-cream/90 transition-colors hover:text-gold">
                  {item.label}
                </Link>
              ))}
              <div className="pt-3">
                <BranchPicker branches={branches} selectedId={selectedBranchId} />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
