"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";

type Faq = { id: string; question: Record<string, string> | null; answer: Record<string, string> | null };

export function FaqAccordion({ faqs, locale }: { faqs: Faq[]; locale: Locale }) {
  const [open, setOpen] = useState<string | null>(null);
  if (faqs.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl divide-y divide-copper/20">
      {faqs.map((f) => {
        const isOpen = open === f.id;
        return (
          <div key={f.id} className="py-2">
            <button
              onClick={() => setOpen(isOpen ? null : f.id)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className="font-serif text-lg text-cream">{localize(f.question, locale)}</span>
              <span className={`text-gold transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="pb-4 text-cream/75">{localize(f.answer, locale)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
