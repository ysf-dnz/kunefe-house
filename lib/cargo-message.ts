import type { Locale } from "@/lib/i18n-field";

const TRACK: Record<string, (no: string) => string> = {
  "Yurtiçi": (no) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${no}`,
  "Aras": (no) => `https://kargotakip.araskargo.com.tr/?tracking=${no}`,
  "MNG": (no) => `https://www.mngkargo.com.tr/gonderi-takip?takipNo=${no}`,
  "PTT": (no) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${no}`,
  "Sürat": (no) => `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${no}`,
};

export const CARRIERS = Object.keys(TRACK);

export function carrierTrackUrl(carrier: string, no: string): string | null {
  const fn = TRACK[carrier];
  return fn ? fn(no) : null;
}

export function buildCargoMessage(p: {
  customerName: string; trackingNo: string; carrier: string; locale: Locale;
}): string {
  const url = carrierTrackUrl(p.carrier, p.trackingNo);
  const tail = url ? `\n${url}` : "";
  if (p.locale === "en") {
    return `Hello ${p.customerName}, your Kunefe House order has shipped! 🚚\nCarrier: ${p.carrier}\nTracking no: ${p.trackingNo}${tail}`;
  }
  if (p.locale === "ar") {
    return `مرحباً ${p.customerName}، تم شحن طلبك من Kunefe House! 🚚\nشركة الشحن: ${p.carrier}\nرقم التتبع: ${p.trackingNo}${tail}`;
  }
  return `Merhaba ${p.customerName}, Kunefe House siparişiniz kargoya verildi! 🚚\nFirma: ${p.carrier}\nTakip no: ${p.trackingNo}${tail}`;
}
