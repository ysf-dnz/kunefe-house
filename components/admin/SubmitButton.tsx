"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children = "Kaydet" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-gold self-start rounded-full px-7 py-2.5 text-sm font-semibold disabled:opacity-60"
    >
      {pending ? "Kaydediliyor…" : children}
    </button>
  );
}
