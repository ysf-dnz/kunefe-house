import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    return <div className="min-h-screen bg-forest">{children}</div>;
  }
  return (
    <div className="min-h-screen bg-forest text-cream">
      <aside className="flex gap-6 border-b border-copper/30 px-6 py-4">
        <Link href="/admin" className="font-serif text-gold">Panel</Link>
        <Link href="/admin/ayarlar">Site Ayarları</Link>
        <Link href="/admin/kategoriler">Kategoriler</Link>
        <Link href="/admin/urunler">Ürünler</Link>
        <Link href="/admin/harita">Harita</Link>
        <Link href="/admin/reels">Reels</Link>
        <Link href="/admin/bayilik-sss">Bayilik SSS</Link>
        <Link href="/admin/basvurular">Başvurular</Link>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
