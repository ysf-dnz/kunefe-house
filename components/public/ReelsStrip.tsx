"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { localize, type Locale } from "@/lib/i18n-field";
import { instagramEmbedUrl } from "@/lib/instagram";

type Reel = {
  id: string;
  title: Record<string, string> | null;
  coverUrl: string | null;
  videoUrl: string | null;
  instagramUrl: string | null;
};

/** Görünür olunca sessiz otomatik oynayan video (yuvarlak balonun içinde) */
function AutoVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
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
    <video ref={ref} src={src} poster={poster} muted loop playsInline autoPlay preload="metadata"
      className="h-full w-full object-cover" />
  );
}

export function ReelsStrip({
  reels, locale, heading, compact = false,
}: { reels: Reel[]; locale: Locale; heading: string; compact?: boolean }) {
  const [active, setActive] = useState<Reel | null>(null);
  if (reels.length === 0) return null;

  const activeEmbed = active?.instagramUrl ? instagramEmbedUrl(active.instagramUrl) : null;

  function onCardClick(r: Reel) {
    const embed = r.instagramUrl ? instagramEmbedUrl(r.instagramUrl) : null;
    if (embed) setActive(r);
    else if (r.instagramUrl) window.open(r.instagramUrl, "_blank", "noopener,noreferrer");
  }

  const size = compact ? "h-16 w-16 sm:h-20 sm:w-20" : "h-20 w-20 sm:h-24 sm:w-24";

  // Instagram hikâyesi gibi yuvarlak balonlar
  const circles = (
    <div className={`flex gap-4 overflow-x-auto pb-2 ${compact ? "" : "flex-wrap justify-center"}`}>
      {reels.map((r, i) => (
        <motion.button
          key={r.id}
          onClick={() => onCardClick(r)}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          className="group flex shrink-0 flex-col items-center gap-2"
        >
          <span className="block rounded-full bg-gradient-to-br from-gold via-copper to-gold p-[3px] transition-transform duration-300 group-hover:scale-105">
            <span className={`relative block overflow-hidden rounded-full bg-forest-deep ring-2 ring-forest-deep ${size}`}>
              {r.videoUrl ? (
                <AutoVideo src={r.videoUrl} poster={r.coverUrl ?? undefined} />
              ) : r.coverUrl ? (
                <Image src={r.coverUrl} alt={localize(r.title, locale)} fill className="object-cover" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-forest-light via-forest to-forest-deep" />
              )}
              {!r.videoUrl && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream/15 backdrop-blur-sm transition-all group-hover:bg-gold/80">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-cream group-hover:fill-forest-deep" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              )}
            </span>
          </span>
          {localize(r.title, locale) && (
            <span className={`max-w-[5.5rem] truncate text-center text-xs text-cream/70 ${compact ? "" : "max-w-[6rem]"}`}>
              {localize(r.title, locale)}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );

  // Site-içi embed lightbox — Instagram beyaz çubukları (üst/alt) kırpılır + vinyet
  const lightbox = (
    <AnimatePresence>
      {active && activeEmbed && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-forest-deep/85 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px]"
          >
            <button onClick={() => setActive(null)} aria-label="Kapat"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-cream/15 text-cream hover:bg-gold hover:text-forest-deep">
              ✕
            </button>
            {/* Yalnız video görünsün: üst başlık ve alt (beğeni/yorum) çubuğu kırpılır.
                Çerçeve oranı IG reel medya alanına (~4:5) oturur; iframe yukarı taşınıp
                üst başlık kesilir, fazla yükseklik alt çubuğu pencere dışına atar. */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black ring-1 ring-gold/30">
              <iframe
                src={activeEmbed}
                title={localize(active.title, locale) || "Instagram Reel"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute left-0 w-full border-0"
                style={{ top: "-110px", height: "calc(100% + 380px)" }}
              />
              {/* Alt çubuk sızarsa maskele */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-black" />
              {/* Vinyet — profesyonel dokunuş */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ boxShadow: "inset 0 0 90px 30px rgba(0,0,0,0.6)" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (compact) {
    return (
      <div className="mt-5">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-copper">{heading}</p>
        {circles}
        {lightbox}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-2 flex justify-center">
        <span className="text-xs uppercase tracking-[0.3em] text-copper">@kunefehouse</span>
      </div>
      <h2 className="text-center font-serif text-3xl text-gold-gradient md:text-4xl">{heading}</h2>
      <div className="mx-auto mt-5 mb-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {circles}
      {lightbox}
    </section>
  );
}
