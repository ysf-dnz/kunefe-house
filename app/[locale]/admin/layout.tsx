import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/require-admin";
import { signOut } from "@/auth";

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
        {!isHQ && <Link href="/admin/menu">Menü / Stok</Link>}
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
            <Link href="/admin/rapor">Rapor</Link>
            <Link href="/admin/haberler">Haberler</Link>
            <Link href="/admin/medya">Medya</Link>
            <Link href="/admin/kargo-siparisler">Kargo Siparişleri</Link>
          </>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          className="ml-auto"
        >
          <span className="mr-3 text-xs text-cream/50">{me.email}</span>
          <button className="text-sm text-red-400 hover:text-red-300">Çıkış</button>
        </form>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
