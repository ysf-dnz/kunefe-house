# i18n Tamamlama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public yüzeydeki kod-gömülü Türkçe metinleri + sayfa SEO başlık/açıklamalarını next-intl mesaj sistemine (tr/en/ar) taşıyarak siteyi tam 3 dilli yapmak.

**Architecture:** Mevcut next-intl kurulumuna yeni namespace'ler eklenir (tüm çeviriler Task 1'de). Server bileşenleri `getTranslations`, client'lar `useTranslations`. TR metinleri birebir korunur (regresyonsuz); EN/AR doğal çeviriler. Admin/kurye/error kapsam dışı.

**Tech Stack:** Next.js 16.2, next-intl 4.13 (TR/EN/AR), Vitest.

---

## File Structure
- `i18n/messages/{tr,en,ar}.json` — yeni namespace'ler: `common, menu, home, franchise, contact, ingredients, cookie, franchiseForm, legal, seo`.
- Public bileşenler + sayfalar `t(...)` kullanır (aşağıdaki tasklar).

---

## Task 1: Mesaj dosyalarına yeni namespace'ler

**Files:** Modify `i18n/messages/tr.json`, `en.json`, `ar.json`

- [ ] **Step 1: tr.json'a ekle** (mevcut son kök anahtardan sonra, virgülle):
```json
  "common": { "explore": "İncele", "discountBadge": "%{percent} İNDİRİM", "all": "Tümü", "soon": "yakında", "apply": "başvurun" },
  "menu": { "eyebrow": "Menümüz", "empty": "Bu kategoride ürün yok.", "ingredients": "İçindekiler", "reelsHeading": "Mutfaktan Kareler" },
  "home": { "badge": "Tescilli Premium Künefe", "featured": "Öne Çıkanlar", "storyEyebrow": "Hikâyemiz" },
  "franchise": {
    "heroBadge": "Franchise Fırsatı", "ctaApply": "Hemen Başvur",
    "title1": "Türkiye'nin ", "titleHighlight": "Tescilli", "title2": " Künefe Markası",
    "heroDesc": "Geleneğin gücünü modern bir konseptle birleştiren Kunefe House ailesine katılın.",
    "registered": "Tescilli Marka",
    "statTargetBranches": "Hedef Şube", "statRegistered": "Tescilli Marka", "statContinents": "Kıta Vizyonu", "statSupport": "Operasyon Desteği",
    "howTitle": "Nasıl Bayi Olunur?",
    "step1Title": "Başvuru", "step1Desc": "Formu doldurun, ekibimiz sizi arasın.",
    "step2Title": "Değerlendirme", "step2Desc": "Lokasyon ve yatırım planını birlikte netleştirelim.",
    "step3Title": "Açılış", "step3Desc": "Eğitim, kurulum ve operasyon desteğiyle kapıları açın.",
    "faqTitle": "Sıkça Sorulan Sorular"
  },
  "contact": { "eyebrow": "Bize Ulaşın", "labelWhatsapp": "WhatsApp", "labelEmail": "E-posta", "labelSocial": "Sosyal", "branchesSoon": "Şubelerimiz Yakında", "branchesSoonDescPre": "Türkiye geneline ve ötesine yayılıyoruz. Bayilik için ", "branchesSoonDescPost": "." },
  "ingredients": { "mapSoon": "Harita yakında." },
  "cookie": { "message": "Deneyiminizi iyileştirmek için zorunlu çerezler kullanıyoruz.", "policyLink": "Çerez Politikası", "accept": "Kabul Et" },
  "franchiseForm": {
    "title": "Bayilik Başvurusu", "namePh": "Ad Soyad *", "phonePh": "Telefon *", "cityPh": "Şehir *",
    "budgetPh": "Yatırım Bütçesi", "locationPh": "Lokasyon / not (opsiyonel)",
    "kvkkLink": "Gizlilik Politikası ve KVKK", "kvkkText": " metnini okudum; kişisel verilerimin başvurum kapsamında işlenmesini onaylıyorum.",
    "submit": "Başvuruyu Gönder", "submitting": "Gönderiliyor…",
    "successTitle": "Başvurunuz Alındı", "successDesc": "En kısa sürede sizinle iletişime geçeceğiz.", "waCta": "WhatsApp'tan da yazın"
  },
  "legal": { "contentSoon": "İçerik yakında eklenecek.", "privacyTitle": "Gizlilik Politikası ve KVKK", "cookieTitle": "Çerez Politikası" },
  "seo": {
    "homeTitle": "Kunefe House — Tescilli Premium Künefe", "homeDesc": "Gelenekten geleceğe uzanan lezzet. Tescilli künefe markası Kunefe House.",
    "menuTitle": "Lezzetlerimiz", "menuDesc": "Fıstıklı, çikolatalı ve spesiyal künefe çeşitlerimizi keşfedin.", "menuItemFallback": "Ürün",
    "ingredientsTitle": "Malzemelerimiz", "ingredientsDesc": "Antep fıstığından Hatay peynirine — malzemelerimizin köklerini interaktif haritada keşfedin.",
    "franchiseTitle": "Bayilik & Franchise", "franchiseDesc": "Türkiye'nin tescilli künefe markası Kunefe House ailesine katılın. Franchise fırsatları ve bayilik başvurusu.",
    "contactTitle": "İletişim", "contactDesc": "Kunefe House ile iletişime geçin — WhatsApp, e-posta ve şubelerimiz.",
    "privacyTitle": "Gizlilik Politikası ve KVKK", "privacyDesc": "Kunefe House gizlilik politikası ve KVKK aydınlatma metni.",
    "cookieTitle": "Çerez Politikası", "cookieDesc": "Kunefe House çerez politikası."
  }
```

- [ ] **Step 2: en.json'a ekle** (aynı anahtarlar, İngilizce):
```json
  "common": { "explore": "View", "discountBadge": "{percent}% OFF", "all": "All", "soon": "soon", "apply": "apply" },
  "menu": { "eyebrow": "Our Menu", "empty": "No products in this category.", "ingredients": "Ingredients", "reelsHeading": "From the Kitchen" },
  "home": { "badge": "Registered Premium Künefe", "featured": "Featured", "storyEyebrow": "Our Story" },
  "franchise": {
    "heroBadge": "Franchise Opportunity", "ctaApply": "Apply Now",
    "title1": "Turkey's ", "titleHighlight": "Registered", "title2": " Künefe Brand",
    "heroDesc": "Join the Kunefe House family, blending tradition with a modern concept.",
    "registered": "Registered Trademark",
    "statTargetBranches": "Target Branches", "statRegistered": "Registered Brand", "statContinents": "Continental Vision", "statSupport": "Operational Support",
    "howTitle": "How to Become a Franchisee", 
    "step1Title": "Application", "step1Desc": "Fill out the form and our team will call you.",
    "step2Title": "Evaluation", "step2Desc": "Let's clarify the location and investment plan together.",
    "step3Title": "Opening", "step3Desc": "Open your doors with training, setup and operational support.",
    "faqTitle": "Frequently Asked Questions"
  },
  "contact": { "eyebrow": "Get in Touch", "labelWhatsapp": "WhatsApp", "labelEmail": "Email", "labelSocial": "Social", "branchesSoon": "Branches Coming Soon", "branchesSoonDescPre": "We are expanding across Turkey and beyond. To become a franchisee, ", "branchesSoonDescPost": "." },
  "ingredients": { "mapSoon": "Map coming soon." },
  "cookie": { "message": "We use essential cookies to improve your experience.", "policyLink": "Cookie Policy", "accept": "Accept" },
  "franchiseForm": {
    "title": "Franchise Application", "namePh": "Full Name *", "phonePh": "Phone *", "cityPh": "City *",
    "budgetPh": "Investment Budget", "locationPh": "Location / note (optional)",
    "kvkkLink": "Privacy Policy & KVKK", "kvkkText": " — I have read it and consent to my personal data being processed for my application.",
    "submit": "Submit Application", "submitting": "Sending…",
    "successTitle": "Application Received", "successDesc": "We will get in touch with you shortly.", "waCta": "Message us on WhatsApp"
  },
  "legal": { "contentSoon": "Content coming soon.", "privacyTitle": "Privacy Policy & KVKK", "cookieTitle": "Cookie Policy" },
  "seo": {
    "homeTitle": "Kunefe House — Registered Premium Künefe", "homeDesc": "Flavor from tradition to the future. The registered künefe brand, Kunefe House.",
    "menuTitle": "Our Menu", "menuDesc": "Discover our pistachio, chocolate and signature künefe varieties.", "menuItemFallback": "Product",
    "ingredientsTitle": "Our Ingredients", "ingredientsDesc": "From Antep pistachio to Hatay cheese — explore the roots of our ingredients on an interactive map.",
    "franchiseTitle": "Franchise", "franchiseDesc": "Join Kunefe House, Turkey's registered künefe brand. Franchise opportunities and applications.",
    "contactTitle": "Contact", "contactDesc": "Get in touch with Kunefe House — WhatsApp, email and our branches.",
    "privacyTitle": "Privacy Policy & KVKK", "privacyDesc": "Kunefe House privacy policy and KVKK disclosure.",
    "cookieTitle": "Cookie Policy", "cookieDesc": "Kunefe House cookie policy."
  }
```

- [ ] **Step 3: ar.json'a ekle** (aynı anahtarlar, Arapça):
```json
  "common": { "explore": "عرض", "discountBadge": "خصم {percent}%", "all": "الكل", "soon": "قريباً", "apply": "قدّم الآن" },
  "menu": { "eyebrow": "قائمتنا", "empty": "لا توجد منتجات في هذه الفئة.", "ingredients": "المكونات", "reelsHeading": "من المطبخ" },
  "home": { "badge": "كنافة فاخرة مسجّلة", "featured": "المميزة", "storyEyebrow": "قصتنا" },
  "franchise": {
    "heroBadge": "فرصة امتياز", "ctaApply": "قدّم الآن",
    "title1": "علامة الكنافة ", "titleHighlight": "المسجّلة", "title2": " في تركيا",
    "heroDesc": "انضم إلى عائلة Kunefe House التي تمزج عراقة التقليد بمفهوم عصري.",
    "registered": "علامة تجارية مسجّلة",
    "statTargetBranches": "الفروع المستهدفة", "statRegistered": "علامة مسجّلة", "statContinents": "رؤية القارات", "statSupport": "دعم التشغيل",
    "howTitle": "كيف تصبح صاحب امتياز؟",
    "step1Title": "التقديم", "step1Desc": "املأ النموذج وسيتصل بك فريقنا.",
    "step2Title": "التقييم", "step2Desc": "لنحدّد الموقع وخطة الاستثمار معاً.",
    "step3Title": "الافتتاح", "step3Desc": "افتح أبوابك بدعم التدريب والتجهيز والتشغيل.",
    "faqTitle": "الأسئلة الشائعة"
  },
  "contact": { "eyebrow": "تواصل معنا", "labelWhatsapp": "واتساب", "labelEmail": "البريد الإلكتروني", "labelSocial": "التواصل الاجتماعي", "branchesSoon": "فروعنا قريباً", "branchesSoonDescPre": "نتوسّع في تركيا وخارجها. لطلب الامتياز ", "branchesSoonDescPost": "." },
  "ingredients": { "mapSoon": "الخريطة قريباً." },
  "cookie": { "message": "نستخدم ملفات تعريف ارتباط ضرورية لتحسين تجربتك.", "policyLink": "سياسة ملفات الارتباط", "accept": "موافق" },
  "franchiseForm": {
    "title": "طلب امتياز", "namePh": "الاسم الكامل *", "phonePh": "الهاتف *", "cityPh": "المدينة *",
    "budgetPh": "ميزانية الاستثمار", "locationPh": "الموقع / ملاحظة (اختياري)",
    "kvkkLink": "سياسة الخصوصية وKVKK", "kvkkText": " — لقد قرأتها وأوافق على معالجة بياناتي الشخصية ضمن طلبي.",
    "submit": "إرسال الطلب", "submitting": "جارٍ الإرسال…",
    "successTitle": "تم استلام طلبك", "successDesc": "سنتواصل معك في أقرب وقت.", "waCta": "راسلنا عبر واتساب"
  },
  "legal": { "contentSoon": "المحتوى قريباً.", "privacyTitle": "سياسة الخصوصية وKVKK", "cookieTitle": "سياسة ملفات الارتباط" },
  "seo": {
    "homeTitle": "Kunefe House — كنافة فاخرة مسجّلة", "homeDesc": "نكهة من التقليد إلى المستقبل. علامة الكنافة المسجّلة Kunefe House.",
    "menuTitle": "قائمتنا", "menuDesc": "اكتشف أصناف الكنافة بالفستق والشوكولاتة وأطباقنا المميزة.", "menuItemFallback": "منتج",
    "ingredientsTitle": "مكوناتنا", "ingredientsDesc": "من فستق عنتاب إلى جبن هاتاي — اكتشف جذور مكوناتنا على خريطة تفاعلية.",
    "franchiseTitle": "الامتياز", "franchiseDesc": "انضم إلى Kunefe House، علامة الكنافة المسجّلة في تركيا. فرص الامتياز والتقديم.",
    "contactTitle": "اتصل بنا", "contactDesc": "تواصل مع Kunefe House — واتساب والبريد الإلكتروني وفروعنا.",
    "privacyTitle": "سياسة الخصوصية وKVKK", "privacyDesc": "سياسة خصوصية Kunefe House وإفصاح KVKK.",
    "cookieTitle": "سياسة ملفات الارتباط", "cookieDesc": "سياسة ملفات الارتباط في Kunefe House."
  }
```

- [ ] **Step 4: Anahtar paritesi + JSON geçerliliği doğrula**

Run:
```bash
cd /Users/macbook/Downloads/kunefe-house && node -e "
const tr=require('./i18n/messages/tr.json'),en=require('./i18n/messages/en.json'),ar=require('./i18n/messages/ar.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?flat(v,p+k+'.'):[p+k]);
const a=flat(tr).sort(),b=flat(en).sort(),c=flat(ar).sort();
const eq=JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(a)===JSON.stringify(c);
if(!eq){console.error('PARİTE HATASI'); console.error('tr-en farkı:',a.filter(x=>!b.includes(x)).concat(b.filter(x=>!a.includes(x)))); console.error('tr-ar farkı:',a.filter(x=>!c.includes(x)).concat(c.filter(x=>!a.includes(x)))); process.exit(1);}
console.log('OK — 3 dil anahtarları birebir, toplam', a.length);
"
```
Expected: `OK — 3 dil anahtarları birebir, ...`.

- [ ] **Step 5: Commit**
```bash
cd /Users/macbook/Downloads/kunefe-house
git add i18n/messages/tr.json i18n/messages/en.json i18n/messages/ar.json
git commit -m "i18n: public + SEO namespace'leri (common/menu/home/franchise/contact/ingredients/cookie/franchiseForm/legal/seo)"
```

---

## Task 2: Global client bileşenleri (Footer, Header, CookieBanner)

**Files:** `components/layout/Footer.tsx`, `components/layout/HeaderClient.tsx`, `components/public/CookieBanner.tsx`

- [ ] **Step 1: Footer**
`components/layout/Footer.tsx` READ et. `İletişim` ve `Çerez Politikası` metinlerini çevir. Footer client değilse en üste `import { useTranslations } from "next-intl";` ekleyip client yapmak yerine — eğer server component ise `getTranslations` kullan. (Footer'ın server/client olduğunu READ ile belirle.) Kullanım: nav.contact zaten var → `İletişim` için `t("nav.contact")` veya yeni değil; `Çerez Politikası` için `cookie.policyLink`. Footer'da bir `useTranslations`/`getTranslations` ekle: `const t = useTranslations()` (client) ya da `const t = await getTranslations()` (server) ve:
- `İletişim` → `{t("nav.contact")}`
- `Çerez Politikası` → `{t("cookie.policyLink")}`

- [ ] **Step 2: HeaderClient** (`"use client"`, zaten `useTranslations("nav")` var)
`aria-label="Menü"` → mevcut `t` "nav" namespace'inde; basitçe sabit kalabilir ama çevirmek için: `nav` namespace'ine eklemek yerine, `aria-label={t("home")}` uygun değil. `aria-label="Menü"` satırını `aria-label="Menu"` (dilbağımsız, kabul edilebilir) yap VEYA `useTranslations()` ile `t("common.all")` değil. **Karar:** `nav` JSON'una üç dile `"menu": "..."` zaten "menu" anahtarı var (Lezzetlerimiz!). Çakışmamak için sabit `aria-label="Menu"` bırak (erişilebilirlik etiketi, görünmez). Değişiklik: `aria-label="Menü"` → `aria-label="Menu"`.

- [ ] **Step 3: CookieBanner** (`"use client"`)
`import { useTranslations } from "next-intl";` ekle, bileşen içinde `const t = useTranslations("cookie");`. Metinleri değiştir:
- `Deneyiminizi iyileştirmek için zorunlu çerezler kullanıyoruz.` → `{t("message")}`
- `Çerez Politikası` (link) → `{t("policyLink")}`
- `Kabul Et` → `{t("accept")}`

- [ ] **Step 4: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add components/layout/Footer.tsx components/layout/HeaderClient.tsx components/public/CookieBanner.tsx
git commit -m "i18n: footer/header/cookie banner"
```

---

## Task 3: Ürün/öne-çıkan bileşenleri (ProductCard, OrderFlow, FeaturedSlider, BrandStory)

**Files:** `components/public/ProductCard.tsx`, `components/public/OrderFlow.tsx`, `components/public/FeaturedSlider.tsx`, `components/public/BrandStory.tsx`

- [ ] **Step 1: ProductCard** (zaten `const t = useTranslations("order")` var)
- `İncele →` → `{t("common.explore" as never)}` YERİNE: ikinci bir çağrı temiz olsun diye `const tc = useTranslations("common");` ekle ve `İncele →` → `{tc("explore")} →`.
- İndirim rozeti `%{discount} İNDİRİM` → `{tc("discountBadge", { percent: discount })}`.

- [ ] **Step 2: OrderFlow** (zaten `useTranslations("order")`)
`const tc = useTranslations("common");` ekle; rozet `%{discount} İNDİRİM` → `{tc("discountBadge", { percent: discount })}`.

- [ ] **Step 3: FeaturedSlider** (`"use client"`)
`import { useTranslations } from "next-intl";` + `const t = useTranslations("home");`. `Öne Çıkanlar` → `{t("featured")}`.

- [ ] **Step 4: BrandStory** (`"use client"`)
`import { useTranslations } from "next-intl";` + `const t = useTranslations("home");`. `Hikâyemiz` → `{t("storyEyebrow")}`.

- [ ] **Step 5: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add components/public/ProductCard.tsx components/public/OrderFlow.tsx components/public/FeaturedSlider.tsx components/public/BrandStory.tsx
git commit -m "i18n: ürün kartı/orderflow/öne çıkanlar/hikâye"
```

---

## Task 4: FranchiseForm + LegalPage

**Files:** `components/public/FranchiseForm.tsx`, `components/public/LegalPage.tsx`

- [ ] **Step 1: FranchiseForm** (`"use client"`)
`import { useTranslations } from "next-intl";` + `const t = useTranslations("franchiseForm");`. Değiştir:
- success `Başvurunuz Alındı` → `{t("successTitle")}`, `En kısa sürede...` → `{t("successDesc")}`, `WhatsApp'tan da yazın` → `{t("waCta")}`
- `Bayilik Başvurusu` → `{t("title")}`
- placeholder'lar: `Ad Soyad *`→`t("namePh")`, `Telefon *`→`t("phonePh")`, `Şehir *`→`t("cityPh")`, select disabled `Yatırım Bütçesi`→`t("budgetPh")`, textarea `Lokasyon / not (opsiyonel)`→`t("locationPh")`
- KVKK: link `Gizlilik Politikası ve KVKK`→`{t("kvkkLink")}`, kalan metin → `{t("kvkkText")}`
- buton: `Gönderiliyor…`→`{t("submitting")}`, `Başvuruyu Gönder`→`{t("submit")}`
(Bütçe option değerleri `1-2M` vb. ve görünen "1–2 Milyon ₺" sabit kalır — para birimi/teknik, çeviri kapsamı dışı.)

- [ ] **Step 2: LegalPage**
`components/public/LegalPage.tsx` READ et. Server component ise `getTranslations`, client ise `useTranslations`. `İçerik yakında eklenecek.` → `t("legal.contentSoon")`. (Bileşen `content` prop alıyor; yalnız fallback metni çevrilecek.)

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add components/public/FranchiseForm.tsx components/public/LegalPage.tsx
git commit -m "i18n: bayilik formu + yasal sayfa fallback"
```

---

## Task 5: lezzetlerimiz (liste + detay) — görünür + SEO

**Files:** `app/[locale]/lezzetlerimiz/page.tsx`, `app/[locale]/lezzetlerimiz/[slug]/page.tsx`

- [ ] **Step 1: Liste sayfası**
`app/[locale]/lezzetlerimiz/page.tsx`:
- `generateMetadata` içinde `getTranslations`: `const t = await getTranslations({ locale, namespace: "seo" });` ve `title: t("menuTitle"), description: t("menuDesc")`.
- Sayfa gövdesinde mevcut `getTranslations("nav")` `t` var; ek olarak `const tm = await getTranslations("menu");`.
- `Menümüz` → `{tm("eyebrow")}`, `Tümü` → `{tm("...")}` → `common.all` kullan: `const tc = await getTranslations("common"); ... {tc("all")}`.
- `Bu kategoride ürün yok.` → `{tm("empty")}`.
- Reels `heading="Mutfaktan Kareler"` → `heading={tm("reelsHeading")}`.

- [ ] **Step 2: Detay sayfası**
`app/[locale]/lezzetlerimiz/[slug]/page.tsx`:
- `generateMetadata` fallback `title: "Ürün"` → `getTranslations({locale, namespace:"seo"})` ile `t("menuItemFallback")`.
- Gövdede `İçindekiler` → `const tm = await getTranslations("menu"); {tm("ingredients")}`.

- [ ] **Step 3: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add "app/[locale]/lezzetlerimiz/page.tsx" "app/[locale]/lezzetlerimiz/[slug]/page.tsx"
git commit -m "i18n: lezzetlerimiz liste+detay (görünür+SEO)"
```

---

## Task 6: bayilik sayfası — görünür + SEO

**Files:** `app/[locale]/bayilik/page.tsx`

- [ ] **Step 1: Çevir**
- `generateMetadata`: `getTranslations({locale, namespace:"seo"})` → `title: t("franchiseTitle"), description: t("franchiseDesc")`.
- `STEPS` dizisini sabit yerine çeviriden kur: gövdede `const t = await getTranslations("franchise");` ekledikten sonra `STEPS`'i kaldır ve JSX'te 3 adımı `t("step1Title")/t("step1Desc")` ... `t("step3Title")/t("step3Desc")` ve numaralar `"01"/"02"/"03"` sabit ile inline yaz (numara çeviri değil). En basiti: gövde içinde:
```tsx
  const steps = [
    { n: "01", title: t("step1Title"), desc: t("step1Desc") },
    { n: "02", title: t("step2Title"), desc: t("step2Desc") },
    { n: "03", title: t("step3Title"), desc: t("step3Desc") },
  ];
```
ve `STEPS.map` → `steps.map`. Dosya başındaki modül-seviyesi `const STEPS = [...]` bloğunu sil.
- `Franchise Fırsatı` → `{t("heroBadge")}`
- başlık parçaları: `Türkiye'nin ` → `{t("title1")}`, `Tescilli` → `{t("titleHighlight")}`, ` Künefe Markası` → `{t("title2")}`
- `Geleneğin gücünü...katılın.` → `{t("heroDesc")}`
- `Hemen Başvur` → `{t("ctaApply")}`
- `Tescilli Marka` (rozet strong) → `{t("registered")}`
- StatCounter label'ları: `Hedef Şube`→`t("statTargetBranches")`, `Tescilli Marka`→`t("statRegistered")`, `Kıta Vizyonu`→`t("statContinents")`, `Operasyon Desteği`→`t("statSupport")`
- `Nasıl Bayi Olunur?` → `{t("howTitle")}`
- `Sıkça Sorulan Sorular` → `{t("faqTitle")}`

- [ ] **Step 2: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add "app/[locale]/bayilik/page.tsx"
git commit -m "i18n: bayilik sayfası (görünür+SEO)"
```

---

## Task 7: iletisim + malzemelerimiz + gizlilik + cerez + ana sayfa

**Files:** `app/[locale]/iletisim/page.tsx`, `app/[locale]/malzemelerimiz/page.tsx`, `app/[locale]/gizlilik/page.tsx`, `app/[locale]/cerez-politikasi/page.tsx`, `app/[locale]/page.tsx`

- [ ] **Step 1: iletisim**
- `generateMetadata`: `seo` → `title: t("contactTitle"), description: t("contactDesc")`.
- gövdede `const tc = await getTranslations("contact");`
- `Bize Ulaşın` → `{tc("eyebrow")}`; kartlar `WhatsApp`/`E-posta`/`Sosyal` → `tc("labelWhatsapp")`/`tc("labelEmail")`/`tc("labelSocial")`
- `Şubelerimiz Yakında` → `{tc("branchesSoon")}`
- Açıklama satırı: `Türkiye geneline ve ötesine yayılıyoruz. Bayilik için ` → `{tc("branchesSoonDescPre")}`, link `başvurun` → `const tcom = await getTranslations("common"); {tcom("apply")}`, son `.` → `{tc("branchesSoonDescPost")}`

- [ ] **Step 2: malzemelerimiz**
- `generateMetadata`: `seo` → `title: t("ingredientsTitle"), description: t("ingredientsDesc")`.
- `Harita yakında.` → `const ti = await getTranslations("ingredients"); {ti("mapSoon")}`

- [ ] **Step 3: gizlilik + cerez**
- `app/[locale]/gizlilik/page.tsx`: `generateMetadata` `title: "Gizlilik Politikası ve KVKK"` → `seo.privacyTitle`, description ekle `seo.privacyDesc`. `<LegalPage title="Gizlilik Politikası ve KVKK" .../>` → `title={t("legal.privacyTitle")}` (`getTranslations()` köksüz veya `legal` namespace).
- `app/[locale]/cerez-politikasi/page.tsx`: aynı şekilde `seo.cookieTitle/cookieDesc` + LegalPage title `legal.cookieTitle`.

- [ ] **Step 4: ana sayfa (badge + reels heading)**
`app/[locale]/page.tsx`:
- `const th = await getTranslations("home");` ekle.
- `badge="Tescilli Premium Künefe"` → `badge={th("badge")}`
- `heading="Mutfaktan Kareler"` (ReelsStrip) → `const tm = await getTranslations("menu"); heading={tm("reelsHeading")}`

- [ ] **Step 5: tsc + commit**
Run: `cd /Users/macbook/Downloads/kunefe-house && npx tsc --noEmit` → Exit 0.
```bash
git add "app/[locale]/iletisim/page.tsx" "app/[locale]/malzemelerimiz/page.tsx" "app/[locale]/gizlilik/page.tsx" "app/[locale]/cerez-politikasi/page.tsx" "app/[locale]/page.tsx"
git commit -m "i18n: iletisim/malzemelerimiz/yasal/ana sayfa (görünür+SEO)"
```

---

## Task 8: Tam doğrulama + build + deploy

- [ ] **Step 1: Kalan Türkçe sabit metin taraması**
Run:
```bash
cd /Users/macbook/Downloads/kunefe-house && python3 - <<'PY'
import os,re
roots=["components/public","components/layout","app"]
tr=re.compile(r'[çğıöşüÇĞİÖŞÜ]')
bad=[]
for root in roots:
  for dp,_,fs in os.walk(root):
    if "/admin" in dp or "/kurye" in dp: continue
    for f in fs:
      if not f.endswith(".tsx"): continue
      p=os.path.join(dp,f)
      if p.endswith(("error.tsx","not-found.tsx","global-error.tsx")): continue
      for i,l in enumerate(open(p,encoding="utf-8"),1):
        s=l.strip()
        if s.startswith(("//","*","/*")) or "aria-label" in s: continue
        if "t(" in s or "tn(" in s or "tc(" in s or "tm(" in s or "th(" in s or "ti(" in s or "localize(" in s: continue
        # JSX text or string literal containing Turkish chars
        if re.search(r'>[^<>{}]*[çğıöşüÇĞİÖŞÜ]', s) or re.search(r'(placeholder|title|label|alt|heading|badge)="[^"]*[çğıöşüÇĞİÖŞÜ]', s):
          bad.append(f"{p}:{i}: {s[:80]}")
print("\n".join(bad) if bad else "TEMİZ — kalan hardcoded TR metni yok")
PY
```
Expected: `TEMİZ` (veya yalnız kasıtlı bırakılanlar: bütçe "1–2 Milyon ₺", marka adı).

- [ ] **Step 2: Anahtar paritesi + build**
Run:
```bash
cd /Users/macbook/Downloads/kunefe-house && node -e "const tr=require('./i18n/messages/tr.json'),en=require('./i18n/messages/en.json'),ar=require('./i18n/messages/ar.json');const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?flat(v,p+k+'.'):[p+k]);const a=flat(tr).sort();if(JSON.stringify(a)!==JSON.stringify(flat(en).sort())||JSON.stringify(a)!==JSON.stringify(flat(ar).sort()))throw new Error('parite');console.log('parite OK',a.length)" && npx tsc --noEmit && npm run build 2>&1 | grep -E "Compiled|Failed|error" | head
```
Expected: parite OK; tsc Exit 0; build başarılı.

- [ ] **Step 3: Manuel önizleme (3 dil)**
Run: `cd /Users/macbook/Downloads/kunefe-house && npm run dev` → her public sayfayı `/tr`, `/en`, `/ar` ile aç:
- Tüm metinler ilgili dilde; TR aynen eskisi.
- AR'de RTL düzgün; uzun metinler layout bozmuyor.
- Sekme başlığı (SEO title) dile göre.

- [ ] **Step 4: Push**
```bash
cd /Users/macbook/Downloads/kunefe-house
git push origin <branch>
```
(Branch/merge: `finishing-a-development-branch`.)

---

## Self-Review Notları
- **Kapsam:** common/menu/home/franchise/contact/ingredients/cookie/franchiseForm/legal/seo namespace'leri (T1) + tüm public bileşen/sayfa wiring (T2-T7) + SEO metadata (T5/T6/T7) + doğrulama (T8). Admin/kurye/error hariç. Spec'le birebir.
- **Anahtar paritesi:** T1 Step4 ve T8 Step2 üç dilin anahtarlarının birebir olduğunu zorunlu kılıyor (eksik anahtar = build/doğrulama hatası).
- **Davranış korunur:** TR değerleri birebir eski metin. Bütçe "1–2 Milyon ₺" ve marka adı kasıtlı sabit (T8 taramasında istisna).
- **Placeholder yok:** Tüm çeviri içerikleri tam; wiring adımları kesin string→anahtar eşlemesi veriyor (subagent dosyayı okuyup uygular).
