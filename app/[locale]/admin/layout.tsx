import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getSessionUser();
  if (!me) return <div className="min-h-screen bg-forest">{children}</div>;
  const isHQ = me.role === "HQ_ADMIN";
  return (
    <div className="min-h-screen bg-forest text-cream">
      <aside className="flex flex-wrap gap-x-6 gap-y-2 border-b border-copper/30 px-6 py-4">
        <Link href="/admin" className="font-serif text-gold">Panel</Link>
        <Link href="/admin/siparisler">Siparişler</Link>
        <Link href="/admin/kuryeler">Kuryeler</Link>
        <Link href="/admin/canli-takip">Canlı Takip</Link>
        {isHQ && (
          <>
            <Link href="/admin/ayarlar">Site Ayarları</Link>
            <Link href="/admin/kategoriler">Kategoriler</Link>
            <Link href="/admin/urunler">Ürünler</Link>
            <Link href="/admin/harita">Harita</Link>
            <Link href="/admin/reels">Reels</Link>
            <Link href="/admin/bayilik-sss">Bayilik SSS</Link>
            <Link href="/admin/basvurular">Başvurular</Link>
            <Link href="/admin/subeler">Şubeler</Link>
            <Link href="/admin/kullanicilar">Kullanıcılar</Link>
            <Link href="/admin/haberler">Haberler</Link>
            <Link href="/admin/medya">Medya</Link>
          </>
        )}
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
