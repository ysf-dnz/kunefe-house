/**
 * Instagram gönderi/reel URL'ini site-içi gösterim için embed adresine çevirir.
 * Belirli bir reel/post değilse (örn. profil linki) null döner → dışa link açılır.
 *
 * Desteklenen: /reel/CODE, /reels/CODE, /p/CODE, /tv/CODE
 */
export function instagramEmbedUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const type = m[1] === "reels" ? "reel" : m[1];
  const code = m[2];
  return `https://www.instagram.com/${type}/${code}/embed`;
}
