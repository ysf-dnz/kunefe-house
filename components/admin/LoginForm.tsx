"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-posta veya şifre hatalı.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 flex max-w-sm flex-col gap-4 rounded-lg bg-forest-light p-8">
      <h1 className="font-serif text-2xl text-gold">Kunefe House Admin</h1>
      <input name="email" type="email" placeholder="E-posta" required
        className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      <input name="password" type="password" placeholder="Şifre" required
        className="rounded border border-copper/40 bg-forest px-3 py-2 text-cream" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="rounded bg-gold px-4 py-2 font-medium text-forest disabled:opacity-50">
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
