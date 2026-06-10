"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function HeaderClient({ logoUrl, logoHeight = 60 }: { logoUrl: string | null; logoHeight?: number }) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: t("home") },
    { href: "/malzemelerimiz", label: t("ingredients") },
    { href: "/lezzetlerimiz", label: t("menu") },
    { href: "/bayilik", label: t("franchise") },
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

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {/* Hamburger (mobil) */}
          <button onClick={() => setOpen((v) => !v)} aria-label="Menü"
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
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
