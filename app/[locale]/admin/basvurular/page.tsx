import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getApplications } from "@/lib/franchise";
import { updateApplicationStatus, deleteApplication } from "./actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Yeni", cls: "text-gold" },
  contacted: { label: "Arandı", cls: "text-pistachio" },
  approved: { label: "Onaylandı", cls: "text-green-400" },
  rejected: { label: "Reddedildi", cls: "text-red-400" },
};

export default async function BasvurularPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const apps = await getApplications();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl text-gold">Bayilik Başvuruları ({apps.length})</h1>

      <ul className="flex flex-col gap-3">
        {apps.map((a) => (
          <li key={a.id} className="card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-cream">
                {a.name} <span className={`ml-2 text-xs ${STATUS[a.status]?.cls ?? "text-cream/60"}`}>● {STATUS[a.status]?.label ?? a.status}</span>
              </p>
              <p className="text-sm text-cream/70">
                {a.phone} · {a.city}{a.budget ? ` · ${a.budget}` : ""}
              </p>
              {a.locationNote && <p className="mt-1 text-sm text-cream/50">{a.locationNote}</p>}
              <p className="mt-1 text-xs text-cream/40">{new Date(a.createdAt).toLocaleString("tr-TR")}</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={updateApplicationStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="status" defaultValue={a.status}
                  className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream">
                  <option value="new">Yeni</option>
                  <option value="contacted">Arandı</option>
                  <option value="approved">Onaylandı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
                <button className="rounded bg-gold/20 px-3 py-1 text-sm text-gold">Güncelle</button>
              </form>
              <a href={`https://wa.me/${a.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="rounded bg-[#25D366]/20 px-3 py-1 text-sm text-[#25D366]">WhatsApp</a>
              <form action={deleteApplication}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-sm text-red-400">Sil</button>
              </form>
            </div>
          </li>
        ))}
        {apps.length === 0 && <p className="text-cream/60">Henüz başvuru yok.</p>}
      </ul>
    </div>
  );
}
