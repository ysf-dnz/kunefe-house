import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking koruması: site iframe içine gömülemez
          { key: "X-Frame-Options", value: "DENY" },
          // MIME sniffing koruması
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer sızıntısını sınırla
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Tarayıcıyı her zaman HTTPS'e zorla (1 yıl)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Kamera/mikrofon kapalı; geolocation yalnız kendi sitemize açık (ETA + sipariş konumu için ŞART)
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
