import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getBranchMenu, effectiveProduct } from "@/lib/branch-catalog";
import { toNumber, formatPrice } from "@/lib/price";
import { saveBranchProduct } from "./actions";

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const me = await requireAdmin();
  if (me.role !== "BRANCH_ADMIN" || !me.branchId) redirect("/admin");
  const { locale } = await params;
  setRequestLocale(locale);
  const rows = await getBranchMenu(me.branchId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Menü / Stok</h1>
      <p className="text-sm text-cream/60">Ürünü kapat, stok ve yerel ₺ fiyat gir. Boş bırakırsan merkez ayarı geçerli.</p>

      <ul className="flex flex-col gap-3">
        {rows.map(({ product, override }) => {
          const central = { price: toNumber(product.price) };
          const eff = effectiveProduct(central, override ? { available: override.available, stock: override.stock, localPrice: toNumber(override.localPrice) } : null);
          const title = (product.title as Record<string, string>)?.tr || product.slug;
          return (
            <li key={product.id} className="card-premium rounded-xl p-4">
              <form action={saveBranchProduct} className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="productId" value={product.id} />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-medium text-cream">{title}</p>
                  <p className="text-xs text-cream/50">Merkez ₺: {central.price != null ? formatPrice(central.price, "TRY") : "—"} · Durum: {eff.available ? "Açık" : "Kapalı"}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-cream/80">
                  <input type="checkbox" name="available" defaultChecked={override?.available ?? true} /> Açık
                </label>
                <label className="flex flex-col gap-1 text-xs text-cream/70">Stok
                  <input name="stock" type="number" min="0" defaultValue={override?.stock ?? ""} placeholder="∞"
                    className="w-24 rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-cream/70">Yerel ₺
                  <input name="localPrice" type="number" min="0" step="0.01" defaultValue={toNumber(override?.localPrice) ?? ""}
                    placeholder={central.price != null ? String(central.price) : "—"}
                    className="w-28 rounded border border-copper/40 bg-forest px-2 py-1.5 text-cream" />
                </label>
                <button className="rounded bg-gold/20 px-4 py-2 text-sm text-gold">Kaydet</button>
              </form>
            </li>
          );
        })}
        {rows.length === 0 && <p className="text-cream/60">Katalogda ürün yok (Genel Merkez ürün eklemeli).</p>}
      </ul>
    </div>
  );
}
