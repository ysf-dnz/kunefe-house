import { setRequestLocale } from "next-intl/server";
import { requireHQ } from "@/lib/require-admin";
import { getUsers } from "@/lib/users";
import { getBranches } from "@/lib/branches";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createUser, resetPassword, toggleUserActive, deleteUser } from "./actions";

export default async function KullanicilarPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireHQ();
  const { locale } = await params;
  setRequestLocale(locale);
  const [users, branches] = await Promise.all([getUsers(), getBranches()]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Kullanıcılar ({users.length})</h1>

      <form action={createUser} className="card-premium grid max-w-2xl gap-3 rounded-xl p-4 sm:grid-cols-2">
        <h2 className="font-serif text-gold sm:col-span-2">Yeni Kullanıcı</h2>
        <input name="email" type="email" required placeholder="E-posta *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <input name="name" required placeholder="Ad Soyad *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
        <select name="role" defaultValue="BRANCH_ADMIN" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="BRANCH_ADMIN">Şube Yöneticisi</option>
          <option value="HQ_ADMIN">Genel Merkez</option>
        </select>
        <select name="branchId" defaultValue="" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream">
          <option value="">— Şube (yönetici için) —</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input name="password" type="text" required placeholder="Şifre (min 6) *" className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream sm:col-span-2" />
        <div className="sm:col-span-2"><SubmitButton>Kullanıcı Ekle</SubmitButton></div>
      </form>

      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id} className={`card-premium flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between ${u.isActive ? "" : "opacity-50"}`}>
            <div>
              <p className="font-medium text-cream">{u.name}
                <span className="ml-2 text-xs text-gold">{u.role === "HQ_ADMIN" ? "Genel Merkez" : `Şube: ${u.branch?.name ?? "—"}`}</span>
                {!u.isActive && <span className="ml-2 text-xs text-cream/40">(Pasif)</span>}
              </p>
              <p className="text-sm text-cream/70">{u.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={resetPassword} className="flex items-center gap-1">
                <input type="hidden" name="id" value={u.id} />
                <input name="password" type="text" placeholder="Yeni şifre" className="w-28 rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
                <button className="rounded bg-gold/20 px-2 py-1 text-sm text-gold">Sıfırla</button>
              </form>
              <form action={toggleUserActive}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="value" value={(!u.isActive).toString()} />
                <button className="rounded bg-copper/20 px-3 py-1 text-sm text-copper">{u.isActive ? "Pasifleştir" : "Aktifleştir"}</button>
              </form>
              <form action={deleteUser}><input type="hidden" name="id" value={u.id} /><button className="text-sm text-red-400">Sil</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
