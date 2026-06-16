# Modüler Özellik Aç/Kapa (Feature Flags) — Tasarım

**Tarih:** 2026-06-16
**Kapsam:** Site Ayarları'ndan tek tıkla aç/kapanabilen özellikler + EN/AR dil aç/kapa. Mevcut `cargoEnabled` / `enabledLocales` desenini genişletir.
**Kapsam dışı (ayrı tur):** TR'yi (varsayılan dil) kapatma — varsayılan dil değişimi + SEO/yönlendirme riski gerektirir.

## Veri Modeli (SiteSettings, additive, hepsi @default(true))
- `showEta` — fıstık/ETA popup (WhatsAppButton→EtaButton)
- `showFranchise` — bayilik (nav + /bayilik + hero butonu)
- `showReels` — reels şeridi (home + lezzetlerimiz)
- `showNews` — haber popup (layout)
- `showStory` — marka hikâyesi (home)
- `showIngredients` — malzemeler (nav + /malzemelerimiz)
- (`cargoEnabled`, `enabledLocales` zaten var)

## Uygulama Noktaları
- **layout.tsx:** `showNews` → NewsPopup; `showEta` → WhatsAppButton'a prop/guard; locale erişim kontrolü: `locale !== "tr"` ve `enabledLocales` içermiyorsa `notFound()`. Header'a `enabledLocales` + flag'ler geç.
- **HeaderClient:** nav linkleri koşullu (`showFranchise`→/bayilik, `showIngredients`→/malzemelerimiz). LanguageSwitcher'a `enabledLocales` geç.
- **LanguageSwitcher:** yalnız `enabledLocales` dillerini göster (TR her zaman var).
- **Hero:** `showFranchise` false ise franchise butonu gizle.
- **home page:** `showReels`→ReelsStrip; `showStory`→BrandStory.
- **lezzetlerimiz page:** `showReels`→ReelsStrip.
- **/bayilik, /malzemelerimiz pages:** flag false ise `notFound()`.
- **WhatsAppButton:** `showEta` false ise düz WhatsApp linki (EtaButton yerine), ya da EtaButton'a `etaEnabled` prop.

## Admin (Ayarlar)
- SettingsForm'a **"Özellikler (Aç/Kapa)"** bölümü: 6 checkbox.
- **"Diller"** bölümü: EN ve AR checkbox (TR kilitli/işaretli, "varsayılan, kapatılamaz" notu). `enabledLocales` string[] olarak kaydedilir (her zaman "tr" içerir).
- actions.ts: 6 boolean + enabledLocales oku/yaz.

## Sağlamlık
- Ayar `null`/eksikse **varsayılan açık** (geriye uyumlu): okurken `?? true`.
- Disabled locale'e doğrudan URL ile gelince notFound (erişim engellenir).
- Build/runtime: getSiteSettings zaten her public sayfada okunuyor (force-dynamic), ek sorgu yok.

## Doğrulama
- Her flag kapatıldığında ilgili öğe kaybolur, açınca döner; sayfa doğrudan URL'de notFound (bayilik/malzemeler).
- EN kapalıyken /en/* → notFound, switcher'da EN yok; AR aynı. TR hep açık.
- tsc + build + Vercel yeşil; regresyon yok.
