"use client";

// Sayfa düzeyinde beklenmedik hata yakalayıcı — site çirkin 500 yerine
// markalı bir mesaj gösterir ve "Tekrar dene" ile kurtulma şansı verir.
export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-3xl text-gold">Bir şeyler ters gitti</h1>
      <p className="max-w-md text-cream/70">
        Geçici bir sorun oluştu. Lütfen tekrar deneyin; sorun sürerse kısa bir süre sonra yeniden ziyaret edin.
      </p>
      <button onClick={reset}
        className="rounded-full border border-gold/60 px-6 py-2 text-gold transition-colors hover:bg-gold hover:text-forest">
        Tekrar dene
      </button>
    </section>
  );
}
