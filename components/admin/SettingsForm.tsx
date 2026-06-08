import { LocalizedInput } from "./LocalizedInput";
import { updateSettings } from "@/app/[locale]/admin/ayarlar/actions";

type Settings = {
  whatsappNumber: string | null;
  heroTitle: Record<string, string> | null;
  heroSubtitle: Record<string, string> | null;
  whatsappMessage: Record<string, string> | null;
};

export function SettingsForm({ settings }: { settings: Settings | null }) {
  return (
    <form action={updateSettings} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">WhatsApp Numarası</label>
        <input name="whatsappNumber" defaultValue={settings?.whatsappNumber ?? ""} placeholder="905555555555"
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <LocalizedInput name="whatsappMessage" label="WhatsApp Hazır Mesaj" defaultValue={settings?.whatsappMessage} multiline />
      <LocalizedInput name="heroTitle" label="Hero Başlık" defaultValue={settings?.heroTitle} />
      <LocalizedInput name="heroSubtitle" label="Hero Alt Başlık" defaultValue={settings?.heroSubtitle} />
      <button type="submit" className="self-start rounded bg-gold px-6 py-2 font-medium text-forest">Kaydet</button>
    </form>
  );
}
