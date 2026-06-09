"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

export function NewsPopup({
  id,
  title,
  body,
  imageUrl,
}: {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `news-popup-${id}`;
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [id]);

  function close() {
    sessionStorage.setItem(`news-popup-${id}`, "1");
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-forest-deep/75 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.9, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 24 }}
            transition={{ type: "spring", duration: 0.45 }}
            onClick={(e) => e.stopPropagation()}
            className="card-premium relative w-full max-w-md overflow-hidden rounded-2xl"
          >
            <button onClick={close} aria-label="Kapat"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-forest-deep/60 text-cream hover:text-gold">
              ✕
            </button>
            {imageUrl && (
              <div className="relative aspect-video w-full">
                <Image src={imageUrl} alt={title} fill className="object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/80 to-transparent" />
              </div>
            )}
            <div className="p-6">
              <h3 className="font-serif text-2xl text-gold-gradient">{title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-cream/80">{body}</p>
              <button onClick={close} className="btn-gold mt-5 rounded-full px-6 py-2 text-sm font-semibold">
                Tamam
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
