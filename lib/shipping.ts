export type ShippingConfig = { fee: number | null; threshold: number | null };

/** Ara toplama göre kargo ücreti (₺). fee yoksa 0; threshold doluysa ve subtotal>=threshold ise 0. */
export function calcShipping(subtotal: number, cfg: ShippingConfig): number {
  if (cfg.fee == null || cfg.fee <= 0) return 0;
  if (cfg.threshold != null && subtotal >= cfg.threshold) return 0;
  return cfg.fee;
}
