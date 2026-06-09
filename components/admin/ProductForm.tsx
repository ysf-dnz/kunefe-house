import { LocalizedInput } from "./LocalizedInput";
import { ImageUpload } from "./ImageUpload";
import { SubmitButton } from "./SubmitButton";

type Category = { id: string; name: Record<string, string> | unknown };
type ProductData = {
  id?: string;
  title?: Record<string, string> | null;
  shortDescription?: Record<string, string> | null;
  ingredients?: string[] | null;
  primaryImageUrl?: string | null;
  secondaryImageUrl?: string | null;
  categoryId?: string | null;
  featured?: boolean;
};

export function ProductForm({ action, categories, product }: { action: (formData: FormData) => void; categories: Category[]; product?: ProductData; }) {
  const ingredientsText = (product?.ingredients ?? []).join("\n");
  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <LocalizedInput name="title" label="Başlık" defaultValue={product?.title} />
      <LocalizedInput name="shortDescription" label="Kısa Açıklama" defaultValue={product?.shortDescription} multiline />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Malzemeler (her satıra bir tane)</label>
        <textarea name="ingredients" defaultValue={ingredientsText} rows={4}
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      </div>
      <ImageUpload name="primaryImageUrl" label="Ana Görsel" folder="products" defaultUrl={product?.primaryImageUrl} />
      <ImageUpload name="secondaryImageUrl" label="Hover Görseli" folder="products" defaultUrl={product?.secondaryImageUrl} />
      <div className="flex flex-col gap-2">
        <label className="text-sm text-cream/80">Kategori</label>
        <select name="categoryId" defaultValue={product?.categoryId ?? ""}
          className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="">— Yok —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{(c.name as Record<string, string>)?.tr ?? c.id}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-cream/80">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} />
        Ana sayfada öne çıkar
      </label>
      <SubmitButton />
      <p className="text-xs text-cream/50">Kaydedince ürün listesine yönlendirilirsiniz.</p>
    </form>
  );
}
