"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

export function BrandStory({
  imageUrl,
  title,
  text,
}: {
  imageUrl: string | null;
  title: string;
  text: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Parallax: görsel scroll'a göre yavaşça kayar
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  if (!title && !imageUrl) return null;

  return (
    <section ref={ref} className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-2">
      {imageUrl && (
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          <motion.div style={{ y }} className="absolute inset-0 h-[124%] -top-[12%]">
            <Image src={imageUrl} alt={title} fill className="object-cover" />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-gold/20" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/50 to-transparent" />
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-xs uppercase tracking-[0.3em] text-copper">Hikâyemiz</span>
        <h2 className="mt-3 font-serif text-3xl text-gold-gradient md:text-4xl">{title}</h2>
        <div className="mt-5 h-px w-20 bg-gradient-to-r from-gold to-transparent" />
        <p className="mt-6 whitespace-pre-line leading-relaxed text-cream/80">{text}</p>
      </motion.div>
    </section>
  );
}
