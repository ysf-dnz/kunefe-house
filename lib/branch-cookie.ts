// Seçili şube çerezi — hem sunucu (server action, dinamik sayfalar) hem istemci
// (header, şube modali) aynı adı ve ayrıştırmayı kullanır. Bu dosya sunucuya özel
// import içermez; istemci bileşenlerinden güvenle import edilebilir.

export const BRANCH_COOKIE = "kh_branch";

/** Şube seçimi değişince yayınlanan pencere olayı (header/modal yeniden okur). */
export const BRANCH_CHANGE_EVENT = "kh:branch-change";

/** `document.cookie` biçimindeki metinden kh_branch değerini okur; yoksa null. */
export function readBranchCookie(cookieString: string | null | undefined): string | null {
  if (!cookieString) return null;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== BRANCH_COOKIE) continue;
    const raw = part.slice(eq + 1).trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}
