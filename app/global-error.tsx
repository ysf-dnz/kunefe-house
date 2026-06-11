"use client";

// Kök layout dahil her şey çökerse devreye giren son savunma hattı.
// Kendi <html>/<body> etiketlerini render etmek zorundadır.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ background: "#10261E", color: "#F5F0E6", fontFamily: "serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1.5rem" }}>
        <div>
          <h1 style={{ color: "#C9A227", fontSize: "1.8rem", marginBottom: "0.75rem" }}>Bir şeyler ters gitti</h1>
          <p style={{ opacity: 0.75, marginBottom: "1.5rem" }}>Geçici bir sorun oluştu. Lütfen tekrar deneyin.</p>
          <button onClick={reset}
            style={{ background: "transparent", border: "1px solid #C9A227", color: "#C9A227", borderRadius: "9999px", padding: "0.5rem 1.5rem", cursor: "pointer" }}>
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
