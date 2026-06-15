import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { requireHQ } from "@/lib/require-admin";
import { getReport, type RangeKey } from "@/lib/report";
import { formatPrice } from "@/lib/price";
import { formatDuration } from "@/lib/duration";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Bugün" }, { key: "7g", label: "7 Gün" }, { key: "30g", label: "30 Gün" }, { key: "all", label: "Tümü" },
];

function revText(r: { TRY: number; USD: number; QAR: number }) {
  const parts: string[] = [];
  if (r.TRY > 0) parts.push(formatPrice(r.TRY, "TRY")!);
  if (r.USD > 0) parts.push(formatPrice(r.USD, "USD")!);
  if (r.QAR > 0) parts.push(formatPrice(r.QAR, "QAR")!);
  return parts.length ? parts.join(" · ") : "—";
}

export default async function RaporPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const { range: rangeRaw } = await searchParams;
  const range: RangeKey = (["today", "7g", "30g", "all"] as const).includes(rangeRaw as RangeKey) ? (rangeRaw as RangeKey) : "7g";
  const r = await getReport(range);

  const card = "card-premium rounded-xl p-4";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-gold">Rapor</h1>
        <div className="flex gap-2">
          {RANGES.map((x) => (
            <Link key={x.key} href={`/admin/rapor?range=${x.key}`}
              className={`rounded-full px-3 py-1 text-sm ${range === x.key ? "pill-gold" : "btn-outline-gold"}`}>{x.label}</Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className={card}><p className="text-xs text-cream/50">Sipariş</p><p className="font-serif text-2xl text-gold">{r.summary.orders}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Teslim</p><p className="font-serif text-2xl text-gold">{r.summary.delivered}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Ort. teslimat</p><p className="font-serif text-2xl text-gold">{formatDuration(r.summary.avgDeliveryMin) ?? "—"}</p></div>
        <div className={card}><p className="text-xs text-cream/50">Aktif kurye</p><p className="font-serif text-2xl text-gold">{r.summary.activeCouriers}</p></div>
        <div className={`${card} col-span-2 sm:col-span-1`}><p className="text-xs text-cream/50">Ciro</p><p className="font-serif text-lg text-gold">{revText(r.summary.revenue)}</p></div>
      </div>

      <div className={card}>
        <h2 className="mb-3 font-serif text-gold">Şubeler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-cream/50">
              <th className="py-1">Şube</th><th>Sipariş</th><th>Teslim</th><th>Ciro</th><th>Ort. teslimat</th>
            </tr></thead>
            <tbody>
              {r.branches.map((b, i) => (
                <tr key={i} className="border-t border-copper/15 text-cream/90">
                  <td className="py-2">{b.name}</td><td>{b.orders}</td><td>{b.delivered}</td>
                  <td>{revText(b.revenue)}</td><td>{formatDuration(b.avgDeliveryMin) ?? "—"}</td>
                </tr>
              ))}
              {r.branches.length === 0 && <tr><td colSpan={5} className="py-3 text-cream/50">Bu aralıkta veri yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 font-serif text-gold">En Çok Satanlar</h2>
          <ul className="flex flex-col gap-1 text-sm text-cream/90">
            {r.topProducts.map((p, i) => (
              <li key={i} className="flex justify-between border-b border-copper/10 py-1"><span>{p.title}</span><span className="text-gold">{p.count}</span></li>
            ))}
            {r.topProducts.length === 0 && <li className="text-cream/50">Veri yok.</li>}
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-3 font-serif text-gold">Düşük Stok (≤5)</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {r.lowStock.map((s, i) => (
              <li key={i} className="flex justify-between border-b border-copper/10 py-1 text-cream/90">
                <span>{s.product} <span className="text-cream/50">· {s.branch}</span></span><span className="text-red-400">{s.stock}</span>
              </li>
            ))}
            {r.lowStock.length === 0 && <li className="text-cream/50">Düşük stok yok.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
