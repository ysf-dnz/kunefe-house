import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/require-admin";
import { getFranchiseFaqs } from "@/lib/franchise";
import { LocalizedInput } from "@/components/admin/LocalizedInput";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createFaq, deleteFaq } from "./actions";

export default async function BayilikSssPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin();
  const { locale } = await params;
  setRequestLocale(locale);
  const faqs = await getFranchiseFaqs();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-2xl text-gold">Bayilik SSS</h1>

      <ul className="flex flex-col gap-2">
        {faqs.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded bg-forest-light px-4 py-3">
            <span>{(f.question as Record<string, string>)?.tr}</span>
            <form action={deleteFaq}>
              <input type="hidden" name="id" value={f.id} />
              <button className="text-sm text-red-400">Sil</button>
            </form>
          </li>
        ))}
        {faqs.length === 0 && <p className="text-cream/60">Henüz soru yok.</p>}
      </ul>

      <form action={createFaq} className="flex max-w-lg flex-col gap-4 rounded-xl bg-forest-light p-5">
        <h2 className="font-serif text-gold">Yeni Soru</h2>
        <LocalizedInput name="question" label="Soru" />
        <LocalizedInput name="answer" label="Cevap" multiline />
        <SubmitButton>Ekle</SubmitButton>
      </form>
    </div>
  );
}
