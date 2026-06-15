"use client";

import { useActionState } from "react";
import { onboardBranch, type OnboardState } from "@/app/[locale]/admin/basvurular/actions";
import { SubmitButton } from "./SubmitButton";

const initial: OnboardState = {};

export function OnboardForm({ applicationId, defaultBranchName, defaultAdminName }: {
  applicationId: string; defaultBranchName: string; defaultAdminName: string;
}) {
  const [state, action] = useActionState(onboardBranch, initial);

  if (state.ok) {
    return (
      <div className="rounded-lg border border-green-400/40 bg-green-400/5 p-3 text-sm">
        <p className="font-medium text-green-400">Şube oluşturuldu ✓</p>
        <p className="mt-1 text-cream/80">Giriş: <span className="text-gold">{state.email}</span></p>
        <p className="text-cream/80">Geçici şifre: <span className="select-all font-mono text-gold">{state.tempPassword}</span></p>
        <p className="mt-1 text-xs text-amber-400">Bu şifreyi şimdi kaydedin/iletin — tekrar gösterilmez.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-copper/30 p-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input name="branchName" defaultValue={defaultBranchName} placeholder="Şube adı"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      <input name="adminEmail" type="email" required placeholder="Yönetici e-posta *"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      <input name="adminName" defaultValue={defaultAdminName} placeholder="Yönetici adı"
        className="rounded border border-copper/40 bg-forest px-2 py-1 text-sm text-cream" />
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <SubmitButton>🏪 Şube Oluştur</SubmitButton>
    </form>
  );
}
