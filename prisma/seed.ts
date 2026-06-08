import { prisma } from "../lib/prisma";

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      whatsappNumber: "905555555555",
      whatsappMessage: { tr: "Merhaba, bilgi almak istiyorum.", en: "Hello, I would like info.", ar: "مرحباً، أود الحصول على معلومات." },
      heroTitle: { tr: "Gelenekten Geleceğe Uzanan Lezzet", en: "A Taste Bridging Tradition and Future", ar: "نكهة تمتد من التقاليد إلى المستقبل" },
      heroSubtitle: { tr: "", en: "", ar: "" },
      enabledLocales: ["tr", "en", "ar"],
    },
  });

  const socials = [{ platform: "instagram", url: "https://instagram.com/kunefehouse", order: 0 }];
  for (const s of socials) {
    await prisma.socialLink.upsert({
      where: { id: s.platform },
      update: { url: s.url, order: s.order },
      create: { id: s.platform, platform: s.platform, url: s.url, order: s.order },
    });
  }
  console.log("Seed tamamlandı.");
}

main().finally(() => prisma.$disconnect());
