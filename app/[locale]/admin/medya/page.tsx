import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { listMedia } from "@/lib/media";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MediaGrid } from "@/components/admin/MediaGrid";

export const dynamic = "force-dynamic";

export default async function MedyaPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const items = await listMedia();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Medya Kütüphanesi</h1>

      <form className="max-w-md rounded-xl bg-forest-light p-5">
        <h2 className="mb-3 font-serif text-gold">Yeni Medya Yükle</h2>
        <ImageUpload name="libraryUpload" label="Görsel / Video" folder="library" accept="image/*,video/*" />
        <p className="mt-2 text-xs text-cream/50">Yükledikten sonra sayfayı yenileyin; aşağıdaki listede görünür.</p>
      </form>

      <MediaGrid items={items} />
    </div>
  );
}
