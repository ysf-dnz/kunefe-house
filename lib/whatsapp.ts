export function buildWhatsAppHref(number: string, message: string): string {
  // wa.me yalnızca rakam ister: +, boşluk, tire vb. temizlenir
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
