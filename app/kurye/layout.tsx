import type { ReactNode } from "react";
import "../globals.css";

export default function KuryeLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
