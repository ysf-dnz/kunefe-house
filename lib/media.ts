import { createClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET, publicUrlFor } from "./storage";

const FOLDERS = ["products", "logos", "reels", "map", "story", "news", "video", "library", "misc"];

export type MediaItem = { path: string; url: string; folder: string; name: string; isVideo: boolean };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function listMedia(): Promise<MediaItem[]> {
  const sb = adminClient();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const items: MediaItem[] = [];

  for (const folder of FOLDERS) {
    const { data, error } = await sb.storage.from(MEDIA_BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data) continue;
    for (const f of data) {
      if (f.name === ".emptyFolderPlaceholder") continue;
      const path = `${folder}/${f.name}`;
      items.push({
        path,
        url: publicUrlFor(base, MEDIA_BUCKET, path),
        folder,
        name: f.name,
        isVideo: /\.(mp4|webm|mov)$/i.test(f.name),
      });
    }
  }
  return items;
}

export async function deleteMedia(path: string): Promise<void> {
  const sb = adminClient();
  await sb.storage.from(MEDIA_BUCKET).remove([path]);
}
