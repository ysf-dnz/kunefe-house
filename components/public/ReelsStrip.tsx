"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";
import { instagramEmbedUrl } from "@/lib/instagram";

type Reel = {
  id: string;
  title: Record<string, string> | null;
  coverUrl: string;
  videoUrl: string | null;
  instagramUrl: string | null;
};

/** Görünür olunca sessiz otomatik oynayan dikey video */
function AutoVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // iOS güvenilirliği için muted'ı JS ile uygula
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.4 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}

export function ReelsStrip({ reels, locale, heading }: { reels: Reel[]; locale: Locale; heading: string }) {
  const [active, setActive] = useState<Reel | null>(null);
  if (reels.length === 0) return null;

  const activeEmbed = active?.instagramUrl ? instagramEmbedUrl(active.instagramUrl) : null;

  function onCardClick(r: Reel) {
    // Instagram reel linki varsa site içi embed lightbox; yoksa bir şey yapma (video zaten oynuyor)
    const embed = r.instagramUrl ? instagramEmbedUrl(r.instagramUrl) : null;
    if (embed) setActive(r);
    else if (r.instagramUrl) window.open(r.instagramUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">@kunefehouse</span>
      </div>
      <h2 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{heading}</h2>
      <div className="mx-auto mt-5 mb-12 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="flex snap-x gap-5 overflow-x-auto pb-4">
        {reels.map((r, i) => (
          <motion.button
            key={r.id}
            onClick={() => onCardClick(r)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group w-44 shrink-0 snap-start text-left"
          >
            <div className="rounded-2xl bg-gradient-to-br from-gold via-copper to-gold p-[2px] transition-transform duration-500 group-hover:scale-[1.03]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-forest-deep">
                {r.videoUrl ? (
                  <AutoVideo src={r.videoUrl} poster={r.coverUrl} />
                ) : (
                  <Image src={r.coverUrl} alt={localize(r.title, locale)} fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-transparent to-transparent" />
                {/* Video yoksa oynat ikonu göster */}
                {!r.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/15 backdrop-blur-sm transition-all group-hover:bg-gold/80">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-cream group-hover:fill-forest-deep" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                )}
                {localize(r.title, locale) && (
                  <p className="absolute inset-x-0 bottom-0 p-3 text-sm font-medium text-cream">
                    {localize(r.title, locale)}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Instagram reel linki için site-içi embed lightbox */}
      <AnimatePresence>
        {active && activeEmbed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-deep/80 p-4 backdrop-blur-sm"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[400px]"
            >
              <button onClick={() => setActive(null)} aria-label="Kapat"
                className="absolute -top-10 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-cream/15 text-cream hover:bg-gold hover:text-forest-deep">
                ✕
              </button>
              <div className="overflow-hidden rounded-2xl bg-white">
                <iframe
                  src={activeEmbed}
                  className="h-[640px] w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={localize(active.title, locale) || "Instagram Reel"}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
