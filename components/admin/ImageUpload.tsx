"use client";

import { useState } from "react";
import Image from "next/image";

export function ImageUpload({ name, label, folder, defaultUrl }: { name: string; label: string; folder: string; defaultUrl?: string | null; }) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Yükleme başarısız");
      return;
    }
    const { url } = await res.json();
    setUrl(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-cream/80">{label}</label>
      {url && <Image src={url} alt="" width={120} height={120} className="h-28 w-28 rounded object-cover" />}
      <input type="hidden" name={name} value={url} />
      <input type="file" accept="image/*" onChange={onChange}
        className="text-sm text-cream/70 file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1 file:text-forest" />
      {loading && <p className="text-xs text-cream/60">Yükleniyor…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
