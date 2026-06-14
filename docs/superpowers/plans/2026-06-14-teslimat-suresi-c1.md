# Teslimat Süresi (Faz C1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Admin'de teslimat süresini ölç (Order.deliveredAt + atama→teslim/toplam süre + ortalama). (B) Yüzen fıstık butonunu, konum paylaşıp WhatsApp'tan "kaç dakikada gelir?" sorduran premium bir ETA modalına dönüştür.

**Architecture:** Additive katman. Saf yardımcılar `lib/duration.ts` + `lib/eta-message.ts` Vitest TDD. Admin tarafı mevcut `updateOrderStatus`/siparisler desenini izler. Fıstık butonu server `WhatsAppButton` → client `EtaButton` (framer-motion modal + Geolocation + wa.me). Dış bağımlılık yok (C2-C4 yalnız spec'te checklist).

**Tech Stack:** Next.js 16.2, React 19, Prisma 7.8 + Supabase, next-intl TR/EN/AR, framer-motion, Tailwind v4, Vitest.

---

## File Structure

**Yeni:**
- `lib/duration.ts` + `tests/unit/duration.test.ts` — süre hesap/format (saf).
- `lib/eta-message.ts` + `tests/unit/eta-message.test.ts` — ETA WhatsApp mesajı (saf).
- `components/ui/EtaButton.tsx` — yüzen fıstık + premium ETA modal (client).

**Değişecek:**
- `prisma/schema.prisma` — `Order.deliveredAt`.
- `app/[locale]/admin/siparisler/actions.ts` — `updateOrderStatus` deliveredAt damgalama.
- `app/[locale]/admin/siparisler/page.tsx` — süre satırı + ortalama.
- `components/ui/WhatsAppButton.tsx` — `<a>` yerine `<EtaButton/>`.
- `i18n/messages/{tr,en,ar}.json` — `eta` namespace.

---

## Task 1: Şema + Migration (Order.deliveredAt)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Alanı ekle**

`prisma/schema.prisma` içinde `Order` modelinde `status        String   @default("new")` satırının ÜSTÜNE ekle:

```prisma
  deliveredAt   DateTime?
```

- [ ] **Step 2: Migration**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx prisma migrate dev --name order_delivered_at`
Expected: "Applying migration ...order_delivered_at" + "✔ Generated Prisma Client". (P1001 olursa 3 kez dene; olmazsa `npx prisma generate` + DONE_WITH_CONCERNS.)

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): Order.deliveredAt"
```

---

## Task 2: `lib/duration.ts` (TDD)

**Files:**
- Create: `lib/duration.ts`
- Test: `tests/unit/duration.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/duration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { minutesBetween, formatDuration } from "@/lib/duration";

describe("minutesBetween", () => {
  it("iki zaman arası dakikayı yuvarlar", () => {
    const a = new Date("2026-06-14T10:00:00Z");
    const b = new Date("2026-06-14T10:34:20Z");
    expect(minutesBetween(a, b)).toBe(34);
  });
  it("ISO string kabul eder", () => {
    expect(minutesBetween("2026-06-14T10:00:00Z", "2026-06-14T11:05:00Z")).toBe(65);
  });
  it("null/eksik veya ters sırada null döner", () => {
    expect(minutesBetween(null, new Date())).toBeNull();
    expect(minutesBetween(new Date(), null)).toBeNull();
    expect(minutesBetween("2026-06-14T11:00:00Z", "2026-06-14T10:00:00Z")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("60 altı dk gösterir", () => { expect(formatDuration(34)).toBe("34 dk"); });
  it("60 ve üstü sa+dk gösterir", () => {
    expect(formatDuration(65)).toBe("1 sa 5 dk");
    expect(formatDuration(120)).toBe("2 sa");
  });
  it("null/negatif null döner", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(-3)).toBeNull();
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/duration.test.ts`
Expected: FAIL — `Cannot find module '@/lib/duration'`.

- [ ] **Step 3: `lib/duration.ts` yaz**

```ts
export function minutesBetween(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined
): number | null {
  if (!from || !to) return null;
  const a = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const b = to instanceof Date ? to.getTime() : new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const min = Math.round((b - a) / 60000);
  return min < 0 ? null : min;
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}
```

- [ ] **Step 4: Pass doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/duration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/duration.ts tests/unit/duration.test.ts
git commit -m "feat: süre hesap yardımcıları (minutesBetween/formatDuration) + testler"
```

---

## Task 3: deliveredAt damgalama (`updateOrderStatus`)

**Files:**
- Modify: `app/[locale]/admin/siparisler/actions.ts`

- [ ] **Step 1: `updateOrderStatus`'u güncelle**

`app/[locale]/admin/siparisler/actions.ts` içindeki `updateOrderStatus` fonksiyonunu şununla değiştir:

```ts
export async function updateOrderStatus(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "new";
  // Teslim edilince zaman damgala; teslimden çıkınca temizle (yanlış işaretleme düzelir)
  const data: { status: string; deliveredAt?: Date | null } = { status };
  if (status === "delivered") {
    const existing = await prisma.order.findUnique({ where: { id }, select: { deliveredAt: true } });
    if (existing && !existing.deliveredAt) data.deliveredAt = new Date();
  } else {
    data.deliveredAt = null;
  }
  await prisma.order.update({ where: { id }, data });
  revalidatePath("/admin/siparisler");
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0 (Prisma `deliveredAt` yoksa önce `npx prisma generate`).

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/siparisler/actions.ts"
git commit -m "feat(admin): teslim durumunda deliveredAt damgalama"
```

---

## Task 4: Siparişler sayfası — süre satırı + ortalama

**Files:**
- Modify: `app/[locale]/admin/siparisler/page.tsx`

- [ ] **Step 1: Import + ortalama hesabı ekle**

`app/[locale]/admin/siparisler/page.tsx`:

(a) Importlara ekle:
```ts
import { minutesBetween, formatDuration } from "@/lib/duration";
```

(b) `const courierLite = ...` satırının altına ekle:
```ts
  const deliveredDurations = orders
    .map((o) => minutesBetween(o.assignedAt, o.deliveredAt))
    .filter((m): m is number => m != null);
  const avgDelivery = deliveredDurations.length
    ? formatDuration(Math.round(deliveredDurations.reduce((a, b) => a + b, 0) / deliveredDurations.length))
    : null;
```

(c) Başlık satırını (`<h1 ...>Siparişler ({orders.length})</h1>`) şununla değiştir:
```tsx
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl text-gold">Siparişler ({orders.length})</h1>
        {avgDelivery && <span className="text-sm text-cream/70">⏱ Ortalama teslimat: <span className="text-gold">{avgDelivery}</span></span>}
      </div>
```

- [ ] **Step 2: Sipariş kartına süre satırı ekle**

Aynı dosyada, tarih satırı `<p className="mt-1 text-xs text-cream/40">{new Date(o.createdAt).toLocaleString("tr-TR")}</p>` ifadesinin ÜSTÜNE ekle:

```tsx
                {o.deliveredAt && (() => {
                  const dlv = formatDuration(minutesBetween(o.assignedAt, o.deliveredAt));
                  const total = formatDuration(minutesBetween(o.createdAt, o.deliveredAt));
                  return (
                    <p className="mt-1 text-sm text-green-400/90">
                      ⏱ {dlv ? `Teslimat: ${dlv}` : "Teslim edildi"}{total ? ` · Toplam: ${total}` : ""}
                    </p>
                  );
                })()}
```

- [ ] **Step 3: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add "app/[locale]/admin/siparisler/page.tsx"
git commit -m "feat(admin): siparişlerde teslimat süresi + ortalama gösterimi"
```

---

## Task 5: `lib/eta-message.ts` (TDD)

**Files:**
- Create: `lib/eta-message.ts`
- Test: `tests/unit/eta-message.test.ts`

- [ ] **Step 1: Testi yaz (failing)**

`tests/unit/eta-message.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildEtaMessage } from "@/lib/eta-message";

describe("buildEtaMessage", () => {
  it("konumlu mesaj soru + maps linki içerir", () => {
    const msg = buildEtaMessage({ locationUrl: "https://maps.google.com/?q=41.01,28.97", locale: "tr" });
    expect(msg).toContain("kaç dakika");
    expect(msg).toContain("https://maps.google.com/?q=41.01,28.97");
  });
  it("adres notu doluysa eklenir", () => {
    const msg = buildEtaMessage({ locationUrl: "https://x", addressNote: "A apt kat 3", locale: "tr" });
    expect(msg).toContain("A apt kat 3");
  });
  it("konum yoksa düz soru mesajı döner", () => {
    const msg = buildEtaMessage({ locationUrl: null, locale: "tr" });
    expect(msg).not.toContain("📍");
    expect(msg.toLowerCase()).toContain("teslimat süresi");
  });
  it("İngilizce locale İngilizce mesaj döner", () => {
    const msg = buildEtaMessage({ locationUrl: "https://x", locale: "en" });
    expect(msg.toLowerCase()).toContain("how many minutes");
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/eta-message.test.ts`
Expected: FAIL.

- [ ] **Step 3: `lib/eta-message.ts` yaz**

```ts
import type { Locale } from "./i18n-field";

export type EtaMessageInput = {
  locationUrl?: string | null;
  addressNote?: string | null;
  locale: Locale;
};

type Labels = { withLoc: string; addr: string; without: string };

const L: Record<Locale, Labels> = {
  tr: {
    withLoc: "Merhaba 🛵 Bu adrese kaç dakikada teslim edebilirsiniz?",
    addr: "🏠",
    without: "Merhaba, teslimat süresi hakkında bilgi alabilir miyim?",
  },
  en: {
    withLoc: "Hello 🛵 How many minutes to deliver to this address?",
    addr: "🏠",
    without: "Hello, may I get information about your delivery time?",
  },
  ar: {
    withLoc: "مرحباً 🛵 كم دقيقة يستغرق التوصيل إلى هذا العنوان؟",
    addr: "🏠",
    without: "مرحباً، هل يمكنني الحصول على معلومات عن مدة التوصيل؟",
  },
};

export function buildEtaMessage(i: EtaMessageInput): string {
  const t = L[i.locale] ?? L.tr;
  if (i.locationUrl) {
    const lines = [t.withLoc, `📍 ${i.locationUrl}`];
    if (i.addressNote && i.addressNote.trim()) lines.push(`${t.addr} ${i.addressNote.trim()}`);
    return lines.join("\n");
  }
  return t.without;
}
```

- [ ] **Step 4: Pass doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run tests/unit/eta-message.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add lib/eta-message.ts tests/unit/eta-message.test.ts
git commit -m "feat: ETA WhatsApp mesaj kurucu + testler"
```

---

## Task 6: i18n `eta` namespace

**Files:**
- Modify: `i18n/messages/{tr,en,ar}.json`

- [ ] **Step 1: tr.json'a ekle**

`i18n/messages/tr.json` kök seviyede (mevcut son anahtardan sonra, virgül ekleyerek):
```json
  "eta": {
    "title": "Adresinize kaç dakikada gelir?",
    "subtitle": "Konumunu paylaş, en hızlı teslim süresini WhatsApp'tan hemen söyleyelim.",
    "shareLocation": "Konumumu Paylaş",
    "locationReceived": "Konum alındı ✓",
    "locationFailed": "Konum alınamadı, dilersen konumsuz sorabilirsin",
    "addressNote": "Adres detayı (bina / kat — opsiyonel)",
    "ask": "WhatsApp'tan Sor",
    "askWithoutLocation": "Konum olmadan sor",
    "close": "Kapat"
  }
```

- [ ] **Step 2: en.json'a ekle**

```json
  "eta": {
    "title": "How fast can we reach you?",
    "subtitle": "Share your location and we'll tell you the fastest delivery time on WhatsApp.",
    "shareLocation": "Share My Location",
    "locationReceived": "Location received ✓",
    "locationFailed": "Couldn't get location — you can still ask without it",
    "addressNote": "Address detail (building / floor — optional)",
    "ask": "Ask on WhatsApp",
    "askWithoutLocation": "Ask without location",
    "close": "Close"
  }
```

- [ ] **Step 3: ar.json'a ekle**

```json
  "eta": {
    "title": "كم دقيقة حتى يصل إليك؟",
    "subtitle": "شارك موقعك وسنخبرك بأسرع وقت توصيل عبر واتساب.",
    "shareLocation": "شارك موقعي",
    "locationReceived": "تم تحديد الموقع ✓",
    "locationFailed": "تعذّر تحديد الموقع — يمكنك السؤال بدونه",
    "addressNote": "تفاصيل العنوان (المبنى / الطابق — اختياري)",
    "ask": "اسأل عبر واتساب",
    "askWithoutLocation": "اسأل بدون موقع",
    "close": "إغلاق"
  }
```

- [ ] **Step 4: Doğrula**

Run: `cd /Users/macbook/Downloads/kunefe-house && node -e "['tr','en','ar'].forEach(l=>{const m=require('./i18n/messages/'+l+'.json'); if(!m.eta?.ask) throw new Error(l); }); console.log('OK')"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add i18n/messages/tr.json i18n/messages/en.json i18n/messages/ar.json
git commit -m "i18n: ETA akışı (eta) anahtarları TR/EN/AR"
```

---

## Task 7: `EtaButton` premium modal (client)

**Files:**
- Create: `components/ui/EtaButton.tsx`

- [ ] **Step 1: Bileşeni yaz**

`components/ui/EtaButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n-field";
import { buildEtaMessage } from "@/lib/eta-message";
import { buildWhatsAppHref } from "@/lib/whatsapp";

export function EtaButton({ number, locale, label }: { number: string; locale: Locale; label: string }) {
  const t = useTranslations("eta");
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locState, setLocState] = useState<"idle" | "ok" | "fail">("idle");
  const [addressNote, setAddressNote] = useState("");

  function shareLocation() {
    if (!navigator.geolocation) { setLocState("fail"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocState("ok"); },
      () => setLocState("fail"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function ask(withLocation: boolean) {
    const locationUrl = withLocation && lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const message = buildEtaMessage({ locationUrl, addressNote: withLocation ? addressNote : null, locale });
    window.open(buildWhatsAppHref(number, message), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label}
        className="fixed bottom-6 end-6 z-50 transition-transform hover:scale-110">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fistik.svg" alt={label} className="h-16 w-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
            role="dialog" aria-modal="true" aria-label={t("title")}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="card-premium w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl">
              <div className="mb-4 flex items-center gap-3">
                <motion.span
                  className="text-3xl"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  aria-hidden="true">🛵</motion.span>
                <h3 className="font-serif text-xl text-gold-gradient">{t("title")}</h3>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("close")}
                  className="ms-auto text-cream/50 hover:text-cream">✕</button>
              </div>
              <p className="mb-4 text-sm text-cream/70">{t("subtitle")}</p>

              <button type="button" onClick={shareLocation}
                className={`mb-3 w-full rounded-lg border px-4 py-2.5 text-sm ${locState === "ok" ? "border-green-400/60 text-green-400" : "border-gold/50 text-gold hover:bg-gold/10"}`}>
                {locState === "ok" ? t("locationReceived") : `📍 ${t("shareLocation")}`}
              </button>
              {locState === "fail" && <p className="mb-3 text-xs text-amber-400">{t("locationFailed")}</p>}

              <input value={addressNote} onChange={(e) => setAddressNote(e.target.value)} maxLength={200}
                placeholder={t("addressNote")}
                className="mb-4 w-full rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />

              <button type="button" onClick={() => ask(true)}
                className="btn-gold w-full rounded-full px-4 py-3 text-sm font-semibold">
                {t("ask")}
              </button>
              <button type="button" onClick={() => ask(false)}
                className="mt-2 w-full text-center text-xs text-cream/50 underline-offset-2 hover:underline">
                {t("askWithoutLocation")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/ui/EtaButton.tsx
git commit -m "feat: EtaButton premium ETA modal (konum + WhatsApp, framer-motion)"
```

---

## Task 8: WhatsAppButton → EtaButton'a bağla

**Files:**
- Modify: `components/ui/WhatsAppButton.tsx`

- [ ] **Step 1: WhatsAppButton'u sadeleştir**

`components/ui/WhatsAppButton.tsx` tamamını şununla değiştir:

```tsx
import { type Locale } from "@/lib/i18n-field";
import { getSiteSettings } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { EtaButton } from "./EtaButton";

export async function WhatsAppButton() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("whatsapp");
  const settings = await getSiteSettings().catch(() => null);
  const number = settings?.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  if (!number) return null;
  return <EtaButton number={number} locale={locale} label={t("label")} />;
}
```

- [ ] **Step 2: Tip + lint**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npx eslint components/ui/WhatsAppButton.tsx components/ui/EtaButton.tsx`
Expected: tsc Exit 0; eslint hatasız.

- [ ] **Step 3: Commit**

```bash
cd /Users/macbook/Downloads/kunefe-house
git add components/ui/WhatsAppButton.tsx
git commit -m "feat: fıstık butonu artık ETA modalı açıyor (doğrudan WhatsApp yerine)"
```

---

## Task 9: Tam doğrulama + build + deploy

**Files:** (yok — doğrulama)

- [ ] **Step 1: Tüm testler**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx vitest run`
Expected: Tüm testler PASS (duration + eta-message dahil; eski testler bozulmamış).

- [ ] **Step 2: Tip + build**

Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit && npm run build`
Expected: tsc Exit 0; build başarılı.

- [ ] **Step 3: Manuel önizleme (dev server)**

Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → tarayıcıda:
- Herhangi bir public sayfa → sağ-alt fıstık ikonu → tıkla → **ETA modalı** açılır (🛵 animasyon + başlık).
- "📍 Konumumu Paylaş" → izin ver → "Konum alındı ✓"; adres detayı yaz → "WhatsApp'tan Sor" → wa.me konumlu ETA mesajıyla açılır.
- "Konum olmadan sor" → düz soru mesajıyla wa.me açılır.
- Mobil: bottom-sheet; AR locale: RTL düzgün; modal Esc/✕/backdrop ile kapanır.
- Admin > Siparişler → bir siparişi "Teslim edildi" yap → "⏱ Teslimat: X dk · Toplam: Y dk" + başlıkta "Ortalama teslimat" görünür; durumu geri al → süre kaybolur.
- Geriye uyumluluk: eski siparişler (deliveredAt yok) sorunsuz.

- [ ] **Step 4: Push (deploy)**

```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge stratejisini `finishing-a-development-branch` belirler.)

---

## Self-Review Notları (plan yazarı tarafından doğrulandı)

- **Spec kapsamı:** A bölümü — deliveredAt (Task 1), damgalama (Task 3), duration helper (Task 2), süre+ortalama gösterimi (Task 4). B bölümü — eta-message (Task 5), i18n (Task 6), EtaButton premium modal (Task 7), fıstık butonu bağlama (Task 8). C2-C4 yalnız spec'te checklist (kod yok). Tümü karşılandı.
- **Tip tutarlılığı:** `minutesBetween`/`formatDuration` imzaları Task 2'de tanımlı, Task 4'te aynı kullanılıyor. `buildEtaMessage` girdisi Task 5 ↔ Task 7 birebir. `EtaButton` prop'ları (number/locale/label) Task 7'de tanımlı, Task 8'de aynı geçiliyor. `eta` i18n anahtarları (Task 6) ile EtaButton `t(...)` çağrıları (Task 7) eşleşiyor: title/subtitle/shareLocation/locationReceived/locationFailed/addressNote/ask/askWithoutLocation/close.
- **Serileştirme:** EtaButton'a Decimal geçmiyor (number string + locale). Order süre alanları (assignedAt/deliveredAt/createdAt) admin sayfasında server-side `minutesBetween`'e veriliyor (Date), client'a ham Date geçmiyor.
- **Placeholder yok:** Tüm adımlar tam kod içerir.
