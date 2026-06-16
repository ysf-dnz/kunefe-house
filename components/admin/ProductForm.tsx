import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";
import { SubmitButton } from "./SubmitButton";
import { PortionEditor } from "./PortionEditor";
import type { Portion } from "@/lib/portions";
import { ingredientsToText } from "@/lib/ingredients";

type Category = { id: string; name: Record<string, string> | unknown };
type ReelLite = { id: string; title: Record<string, string> | null; coverUrl: string | null };
type ProductData = {
  id?: string;
  title?: Record<string, string> | null;
  shortDescription?: Record<string, string> | null;
  ingredients?: unknown;
  primaryImageUrl?: string | null;
  secondaryImageUrl?: string | null;
  categoryId?: string | null;
  featured?: boolean;
  price?: number | null;
  oldPrice?: number | null;
  priceUsd?: number | null; oldPriceUsd?: number | null;
  priceQar?: number | null; oldPriceQar?: number | null;
  showPrice?: boolean;
  portions?: Portion[] | null;
  cargoAvailable?: boolean;
  cargoStock?: number | null;
};

export function ProductForm({ action, categories, product, allReels = [], selectedReelIds = [] }: { action: (formData: FormData) => void; categories: Category[]; product?: ProductData; allReels?: ReelLite[]; selectedReelIds?: string[]; }) {
  const ingredientsText = ingredientsToText(product?.ingredients);
  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <LocalizedInput name="title" label="Başlık" defaultValue={product?.title} />
      <LocalizedInput name="shortDescription" label="Kısa Açıklama" defaultValue={product?.shortDescription} multiline />
      <LocalizedInput name="ingredients" label="Malzemeler (her satıra bir tane)" defaultValue={ingredientsText} multiline />
      <p className="-mt-4 text-xs text-cream/50">Her dil için ayrı malzeme listesi. EN/AR boş bırakılırsa o dilde Türkçe liste gösterilir.</p>
      <ImageUpload name="primaryImageUrl" label="Ana Görsel" folder="products" defaultUrl={product?.primaryImageUrl} />
      <ImageUpload name="secondaryImageUrl" label="Hover Görseli" folder="products" defaultUrl={product?.secondaryImageUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Kategori</label>
        <select name="categoryId" defaultValue={product?.categoryId ?? ""}
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="">&mdash; Yok &mdash;</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{(c.name as Record<string, string>)?.tr ?? c.id}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} />
        Ana sayfada öne çıkar
      </label>

      <div className="gold-divider my-1" />
      <h2 className="font-serif text-gold">Fiyat (opsiyonel)</h2>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="showPrice" defaultChecked={product?.showPrice} />
        Fiyatı sitede göster
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Fiyat (&#8378;)</label>
          <input name="price" type="number" step="0.01" min="0" inputMode="decimal"
            defaultValue={product?.price ?? ""} placeholder="149.90"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Eski Fiyat (indirim için)</label>
          <input name="oldPrice" type="number" step="0.01" min="0" inputMode="decimal"
            defaultValue={product?.oldPrice ?? ""} placeholder="199.90"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
      </div>
      <p className="text-xs text-cream/50">Eski fiyat doluysa üstü çizili gösterilir ve indirim rozeti çıkar. Fiyatı gizlemek için &quot;Fiyatı sitede göster&quot; işaretini kaldırın.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Fiyat ($)</label>
          <input name="priceUsd" type="number" step="0.01" min="0" defaultValue={product?.priceUsd ?? ""} placeholder="10.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Eski Fiyat ($)</label>
          <input name="oldPriceUsd" type="number" step="0.01" min="0" defaultValue={product?.oldPriceUsd ?? ""} placeholder="12.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Fiyat (QAR)</label>
          <input name="priceQar" type="number" step="0.01" min="0" defaultValue={product?.priceQar ?? ""} placeholder="36.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Eski Fiyat (QAR)</label>
          <input name="oldPriceQar" type="number" step="0.01" min="0" defaultValue={product?.oldPriceQar ?? ""} placeholder="40.00"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
      </div>
      <p className="text-xs text-cream/50">$ ve QAR boş bırakılırsa o dilde fiyat gösterilmez (&#8378; Türkçe içindir).</p>

        <div className="gold-divider my-1" />
        <h2 className="font-serif text-gold">Kargo Mağazası</h2>
        <label className="flex items-center gap-2 text-sm text-cream/80">
          <input type="checkbox" name="cargoAvailable" defaultChecked={product?.cargoAvailable} />
          Bu ürün kargoyla satılsın (/magaza)
        </label>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-cream/80">Kargo stoğu (boş = sınırsız)</label>
          <input name="cargoStock" type="number" min="0" step="1" inputMode="numeric"
            defaultValue={product?.cargoStock ?? ""} placeholder="örn. 50"
            className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        </div>
        <p className="text-xs text-cream/50">Kargo fiyatı = yukarıdaki &#8378; fiyatıdır. Stok 0 olunca mağazada &quot;Tükendi&quot; görünür.</p>

        <div className="gold-divider my-1" />
        <h2 className="font-serif text-gold">Porsiyonlar (kişi sayısına göre fiyat)</h2>
        <PortionEditor name="portions" defaultValue={product?.portions} />

      <div className="gold-divider my-1" />
      <h2 className="font-serif text-gold">Bu ürüne ait Reels</h2>
      {allReels.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {allReels.map((r) => (
            <label key={r.id} className="flex w-32 cursor-pointer flex-col gap-1 text-xs text-cream/80">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-lg border border-copper/30 bg-forest">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.coverUrl && <img src={r.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              </span>
              <span className="flex items-center gap-1">
                <input type="checkbox" name="reelIds" value={r.id} defaultChecked={selectedReelIds.includes(r.id)} />
                <span className="truncate">{r.title?.tr || "—"}</span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-cream/50">
          Henüz reel yok. Önce <a href="/admin/reels" className="text-gold underline">Reels</a> sayfasından
          reel ekle (video, kapak veya yalnız Instagram linki yeterli), sonra burada bu ürüne bağla.
        </p>
      )}
      <SubmitButton />
      <p className="text-xs text-cream/50">Kaydedince ürün listesine yönlendirilirsiniz.</p>
    </form>
  );
}
