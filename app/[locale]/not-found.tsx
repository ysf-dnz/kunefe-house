import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="font-serif text-6xl text-gold/40">404</span>
      <h1 className="font-serif text-3xl text-gold">Sayfa bulunamadı</h1>
      <p className="max-w-md text-cream/70">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link href="/"
        className="rounded-full border border-gold/60 px-6 py-2 text-gold transition-colors hover:bg-gold hover:text-forest">
        Ana sayfaya dön
      </Link>
    </section>
  );
}
