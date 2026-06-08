import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const MEDIA_BUCKET = "media";

export function buildStoragePath(folder: string, originalName: string): string {
  const dotIdx = originalName.lastIndexOf(".");
  const ext = dotIdx > 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "bin";
  return `${folder}/${randomUUID()}.${ext}`;
}

export function publicUrlFor(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage env eksik");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadImage(
  folder: string,
  file: { name: string; arrayBuffer: () => Promise<ArrayBuffer>; type: string }
): Promise<string> {
  const supabase = adminClient();
  const path = buildStoragePath(folder, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Yükleme hatası: ${error.message}`);
  return publicUrlFor(process.env.NEXT_PUBLIC_SUPABASE_URL!, MEDIA_BUCKET, path);
}

export async function deleteImageByUrl(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  const supabase = adminClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
