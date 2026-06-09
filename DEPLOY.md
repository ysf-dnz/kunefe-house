# Kunefe House — Vercel Deploy Rehberi

## Önkoşullar
- GitHub hesabı (kodu push etmek için)
- Vercel hesabı (vercel.com — GitHub ile ücretsiz)
- Supabase projesi (zaten kurulu: `jigyfygzpdgzfyvsuvfk`)

---

## 1. Kodu GitHub'a yükle

```bash
cd ~/Downloads/kunefe-house
# GitHub'da boş bir repo oluştur (kunefe-house), sonra:
git remote add origin https://github.com/<kullanıcı-adın>/kunefe-house.git
git push -u origin main
```

> `.env` zaten `.gitignore`'da — gizli anahtarlar repoya **gitmez**. Bu doğru ve güvenli.

---

## 2. Vercel'e bağla
1. vercel.com → **Add New → Project** → GitHub repo'yu seç (`kunefe-house`).
2. Framework: **Next.js** (otomatik algılar).
3. Build ayarlarına dokunma (package.json'daki `build` script'i Prisma client'ı üretir).
4. **Environment Variables** bölümüne aşağıdaki değişkenleri ekle (sonraki adım).
5. **Deploy**.

---

## 3. Environment Variables (Vercel Dashboard → Settings → Environment Variables)

| Anahtar | Değer | Not |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.jigyfygzpdgzfyvsuvfk:ŞİFRE@aws-1-eu-central-1.pooler.supabase.com:5432/postgres` | Supabase session pooler |
| `AUTH_SECRET` | (openssl rand -base64 33 ile üretilmiş değer) | `.env`'den kopyala |
| `ADMIN_EMAIL` | `admin@kunefehouse.com` | |
| `ADMIN_PASSWORD_HASH` | `$2b$12$...` (HAM hash) | ⚠️ Vercel'de `\$` ESCAPE YOK — ham bcrypt hash'i yapıştır |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `905XXXXXXXXX` | |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jigyfygzpdgzfyvsuvfk.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Gizli (server-only) |
| `NEXT_PUBLIC_SITE_URL` | `https://kunefehouse.com` | Production domain |

### ⚠️ Kritik notlar
- **ADMIN_PASSWORD_HASH:** Yerel `.env`'de `$` işaretleri `\$` olarak escape'liydi (Next.js dosya-parser'ı için). **Vercel panelinde escape KULLANMA** — ham hash'i (örn. `$2b$12$fKNcqU...`) olduğu gibi yapıştır. Vercel env değerlerini dolar-genişletme yapmaz.
- **DATABASE_URL** prod'da da aynı Supabase'i kullanır; migration'lar zaten uygulanmış. Yeni migration eklersen deploy öncesi `npx prisma migrate deploy` çalıştır.
- Env değişkenlerini ekledikten sonra **Redeploy** gerekir.

---

## 4. Domain bağlama (kunefehouse.com)
1. Vercel → Project → **Settings → Domains** → `kunefehouse.com` ekle.
2. Domain sağlayıcında (alan adını aldığın yer) Vercel'in verdiği DNS kayıtlarını (A / CNAME) gir.
3. SSL otomatik gelir.

---

## 5. Deploy sonrası kontrol listesi
- [ ] `https://kunefehouse.com` açılıyor (TR), `/en` `/ar` çalışıyor
- [ ] `/admin/login` → giriş yapılıyor
- [ ] Admin'den ürün/görsel ekleme çalışıyor (Supabase Storage)
- [ ] `/sitemap.xml` ve `/robots.txt` doğru domain'i gösteriyor
- [ ] WhatsApp butonu doğru numarayı açıyor
- [ ] Mobilde hamburger menü + responsive

---

## Notlar
- **Görseller:** Supabase Storage "media" bucket'ında, public. `next.config.ts` Supabase host'unu allowlist'liyor.
- **Cache:** Public sayfalar ISR (60s). İçerik değişiklikleri 60 saniye içinde canlıda yansır.
- **Playwright e2e** CI'da çalıştırılabilir ama deploy'u bloke etmez.
