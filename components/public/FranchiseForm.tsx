"use client";

import { useActionState } from "react";
import { submitApplication, type ApplicationState } from "@/app/[locale]/bayilik/actions";

const initial: ApplicationState = {};

export function FranchiseForm({ whatsappNumber }: { whatsappNumber: string | null }) {
  const [state, formAction, pending] = useActionState(submitApplication, initial);

  if (state.ok) {
    const waText = encodeURIComponent("Merhaba, bayilik başvurusu yaptım. Bilgi almak istiyorum.");
    return (
      <div className="card-premium rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-gold" aria-hidden="true">
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
        <h3 className="font-serif text-2xl text-gold-gradient">Başvurunuz Alındı</h3>
        <p className="mt-3 text-cream/75">En kısa sürede sizinle iletişime geçeceğiz.</p>
        {whatsappNumber && (
          <a href={`https://wa.me/${whatsappNumber}?text=${waText}`} target="_blank" rel="noopener noreferrer"
            className="btn-gold mt-6 inline-block rounded-full px-7 py-3 text-sm font-semibold">
            WhatsApp'tan da yazın
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="card-premium flex flex-col gap-4 rounded-2xl p-8">
      <h3 className="font-serif text-2xl text-gold-gradient">Bayilik Başvurusu</h3>
      {/* Honeypot (gizli) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
        className="absolute left-[-9999px]" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Ad Soyad *"
          className="rounded-lg border border-copper/30 bg-forest/60 px-4 py-3 text-cream placeholder:text-cream/40" />
        <input name="phone" required placeholder="Telefon *"
          className="rounded-lg border border-copper/30 bg-forest/60 px-4 py-3 text-cream placeholder:text-cream/40" />
        <input name="city" required placeholder="Şehir *"
          className="rounded-lg border border-copper/30 bg-forest/60 px-4 py-3 text-cream placeholder:text-cream/40" />
        <select name="budget" defaultValue=""
          className="rounded-lg border border-copper/30 bg-forest/60 px-4 py-3 text-cream">
          <option value="" disabled>Yatırım Bütçesi</option>
          <option value="1-2M">1–2 Milyon ₺</option>
          <option value="2-4M">2–4 Milyon ₺</option>
          <option value="4M+">4 Milyon ₺ +</option>
        </select>
      </div>
      <textarea name="locationNote" rows={3} placeholder="Lokasyon / not (opsiyonel)"
        className="rounded-lg border border-copper/30 bg-forest/60 px-4 py-3 text-cream placeholder:text-cream/40" />

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="btn-gold self-start rounded-full px-8 py-3 text-sm font-semibold disabled:opacity-60">
        {pending ? "Gönderiliyor…" : "Başvuruyu Gönder"}
      </button>
    </form>
  );
}
