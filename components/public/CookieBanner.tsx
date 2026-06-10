"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-[55] p-4"
        >
          <div className="card-premium mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl p-5 sm:flex-row">
            <p className="flex-1 text-sm text-cream/80">
              Deneyiminizi iyileştirmek için zorunlu çerezler kullanıyoruz.{" "}
              <Link href="/cerez-politikasi" className="text-gold underline">Çerez Politikası</Link>
            </p>
            <button onClick={accept} className="btn-gold shrink-0 rounded-full px-6 py-2 text-sm font-semibold">
              Kabul Et
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
