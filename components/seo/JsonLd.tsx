export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // <script> etiketinden kaçışı engelle: < > & karakterlerini güvenli unicode'a çevir.
  // (CMS içeriği "</script>" içerse bile script bloğu kırılamaz — XSS koruması.)
  const safe = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe }} />
  );
}
