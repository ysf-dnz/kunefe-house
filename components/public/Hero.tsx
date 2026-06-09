"use client";

import Link from "next/link";

export function Hero({
  videoUrl,
  overlay,
  badge,
  title,
  discoverLabel,
  franchiseLabel,
}: {
  videoUrl: string | null;
  overlay: number;
  badge: string;
  title: string;
  discoverLabel: string;
  franchiseLabel: string;
}) {
  return (
    <section className="relative flex min-h-[82vh] flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center">
      {/* Video arka plan */}
      {videoUrl && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={videoUrl} />
        </video>
      )}
      {/* Karartma + altın hâle */}
      {videoUrl ? (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(16,34,25,${overlay})` }} />
      ) : (
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      )}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <span className="relative inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-gold backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        {badge}
      </span>

      <h1 className="relative max-w-4xl font-serif text-4xl leading-tight text-cream md:text-6xl">
        {title}
      </h1>

      <div className="relative flex flex-wrap items-center justify-center gap-4">
        <Link href="/lezzetlerimiz" className="btn-gold rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide">
          {discoverLabel}
        </Link>
        <Link href="/bayilik" className="btn-outline-gold rounded-full px-8 py-3.5 text-sm font-semibold tracking-wide backdrop-blur-sm">
          {franchiseLabel}
        </Link>
      </div>
    </section>
  );
}
