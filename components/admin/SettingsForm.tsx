"use client";

import { useActionState, useState } from "react";
import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";
import { SubmitButton } from "./SubmitButton";
import { updateSettings, type SaveState } from "@/app/[locale]/admin/ayarlar/actions";

type Settings = {
  whatsappNumber: string | null;
  heroTitle: Record<string, string> | null;
  heroSubtitle: Record<string, string> | null;
  whatsappMessage: Record<string, string> | null;
  logoHeaderUrl: string | null;
  logoHeight: number | null;
  contactEmail: string | null;
  heroVideoUrl: string | null;
  heroOverlay: number | null;
  storyImageUrl: string | null;
  storyTitle: Record<string, string> | null;
  storyText: Record<string, string> | null;
  privacyPolicy: Record<string, string> | null;
  cookiePolicy: Record<string, string> | null;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [state, formAction] = useActionState<SaveState, FormData>(updateSettings, {});
  const [logoHeight, setLogoHeight] = useState(settings?.logoHeight ?? 60);
  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <ImageUpload name="logoHeaderUrl" label="Logo" folder="logos" defaultUrl={settings?.logoHeaderUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">
          Logo Boyutu: <span className="text-gold">{logoHeight}px</span>
        </label>
        <input
          type="range"
          name="logoHeight"
          min={32}
          max={120}
          step={2}
          value={logoHeight}
          onChange={(e) => setLogoHeight(parseInt(e.target.value, 10))}
          className="w-full accent-[#C9A227]"
        />
        {settings?.logoHeaderUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoHeaderUrl} alt="Logo önizleme" style={{ height: logoHeight }}
            className="w-auto self-start rounded bg-forest p-1" />
        )}
        <span className="text-xs text-cream/40">Sitedeki üst menüde logonun yüksekliği (canlı önizleme yukarıda).</span>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">WhatsApp Numarası</label>
        <input name="whatsappNumber" defaultValue={settings?.whatsappNumber ?? ""} placeholder="905555555555"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">İletişim E-postası</label>
        <input name="contactEmail" type="email" defaultValue={settings?.contactEmail ?? ""} placeholder="info@kunefehouse.com"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <LocalizedInput name="whatsappMessage" label="WhatsApp Hazır Mesaj" defaultValue={settings?.whatsappMessage} multiline />
      <LocalizedInput name="heroTitle" label="Hero Başlık" defaultValue={settings?.heroTitle} />
      <LocalizedInput name="heroSubtitle" label="Hero Alt Başlık" defaultValue={settings?.heroSubtitle} />

      <div className="gold-divider my-2" />
      <h2 className="font-serif text-gold">Hero Video</h2>
      <ImageUpload name="heroVideoUrl" label="Arka Plan Videosu (mp4/webm)" folder="video" accept="video/*" defaultUrl={settings?.heroVideoUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Karartma (overlay) opaklığı: 0–1</label>
        <input name="heroOverlay" type="number" step="0.1" min="0" max="1" defaultValue={settings?.heroOverlay ?? 0.5}
          className="w-32 rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>

      <div className="gold-divider my-2" />
      <h2 className="font-serif text-gold">Marka Hikâyesi</h2>
      <ImageUpload name="storyImageUrl" label="Hikâye Görseli (parallax)" folder="story" defaultUrl={settings?.storyImageUrl} />
      <LocalizedInput name="storyTitle" label="Hikâye Başlık" defaultValue={settings?.storyTitle} />
      <LocalizedInput name="storyText" label="Hikâye Metni" defaultValue={settings?.storyText} multiline />

      <div className="gold-divider my-2" />
      <h2 className="font-serif text-gold">Yasal Metinler (KVKK)</h2>
      <LocalizedInput name="privacyPolicy" label="Gizlilik Politikası ve KVKK" defaultValue={settings?.privacyPolicy} multiline />
      <LocalizedInput name="cookiePolicy" label="Çerez Politikası" defaultValue={settings?.cookiePolicy} multiline />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton />
        {state.ok && <span className="text-sm text-green-400">✓ Kaydedildi</span>}
        {state.error && <span className="text-sm text-red-400">{state.error}</span>}
      </div>
    </form>
  );
}
