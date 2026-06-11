import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { buildStoragePath, publicUrlFor, MEDIA_BUCKET } from "@/lib/storage";

// Tarayıcıdan doğrudan Supabase'e yükleme için imzalı URL üretir.
// Böylece dosya Vercel API route'undan (4.5MB limit) geçmez — büyük videolar yüklenebilir.
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { folder, filename, contentType } = await req.json().catch(() => ({}));
  if (!filename) return NextResponse.json({ error: "Dosya adı yok" }, { status: 400 });
  if (contentType && !(contentType.startsWith("image/") || contentType.startsWith("video/"))) {
    return NextResponse.json({ error: "Sadece görsel veya video" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Storage yapılandırması eksik" }, { status: 500 });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  // Klasör adı yalnız harf/rakam/tire: keyfi depolama yolu engellenir
  const safeFolder = /^[a-z0-9-]{1,40}$/.test(folder || "") ? (folder as string) : "misc";
  const path = buildStoragePath(safeFolder, filename);
  const { data, error } = await sb.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "İmza üretilemedi" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: publicUrlFor(url, MEDIA_BUCKET, path),
  });
}
