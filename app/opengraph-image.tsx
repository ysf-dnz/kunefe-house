import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kunefe House — Tescilli Premium Künefe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #102219 0%, #1B3B2F 55%, #16332A 100%)",
          color: "#F5F0E6",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 8, color: "#C9A227", textTransform: "uppercase" }}>
          Tescilli Premium Künefe
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, marginTop: 16, display: "flex", gap: 18 }}>
          <span>KUNEFE</span>
          <span style={{ color: "#C9A227" }}>HOUSE</span>
        </div>
        <div style={{ fontSize: 28, marginTop: 20, color: "#F5F0E6" }}>
          Gelenekten Geleceğe Uzanan Lezzet
        </div>
        <div style={{ width: 220, height: 3, marginTop: 28, background: "linear-gradient(90deg, transparent, #C9A227, transparent)" }} />
      </div>
    ),
    { ...size }
  );
}
