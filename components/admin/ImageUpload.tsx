"use client";

import { useState } from "react";
import Image from "next/image";

export function ImageUpload({ name, label, folder, defaultUrl, accept = "image/*" }: { name: string; label: string; folder: string; defaultUrl?: string | null; accept?: string; }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      // 1) İmzalı yükleme URL'i al (küçük istek — Vercel limitine takılmaz)
      const signRes = await fetch("/api/admin/sign-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
      });
      if (!signRes.ok) {
        const j = await signRes.json().catch(() => ({}));
        throw new Error(j.error || "İmza alınamadı");
      }
      const { signedUrl, publicUrl } = await signRes.json();
      // 2) Dosyayı DOĞRUDAN Supabase'e yükle (tarayıcı → Supabase, Vercel'i atlar)
      const up = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!up.ok) throw new Error(`Yükleme başarısız (${up.status})`);
      setUrl(publicUrl);
    } catch (err) {
      setError((err as Error).message || "Yükleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-cream/80">{label}</label>
      {url && (
        <div className="flex items-center gap-3">
          {isVideo
            ? <video src={url} className="h-28 w-28 rounded object-cover" muted />
            : <Image src={url} alt="" width={120} height={120} className="h-28 w-28 rounded object-cover" />}
          <button type="button" onClick={() => setUrl("")}
            className="rounded border border-red-400/50 px-3 py-1 text-xs text-red-400 hover:bg-red-400/10">
            Kaldır
          </button>
        </div>
      )}
      <input type="hidden" name={name} value={url} />
      <input type="file" accept={accept} onChange={onChange}
        className="text-sm text-cream/70 file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1 file:text-forest" />
      {loading && <p className="text-xs text-cream/60">Yükleniyor…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
