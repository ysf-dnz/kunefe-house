import { setRequestLocale } from "next-intl/server";

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <h1 className="font-serif text-2xl text-gold">Yönetim Paneli</h1>
      <p className="mt-2 text-cream/70">Soldaki menüden bir bölüm seçin.</p>
    </div>
  );
}
