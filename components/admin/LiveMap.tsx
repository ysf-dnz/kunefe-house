"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isCourierLive } from "@/lib/geo";

type Courier = { id: string; name: string; lat: number | null; lng: number | null; lastSeenAt: string | null };
type OrderPin = { id: string; lat: number | null; lng: number | null; customerName: string | null; productTitle: string };
type Snapshot = { couriers: Courier[]; orders: OrderPin[] };

/** HTML kaçışı — popup'lara kullanıcı girdisi (müşteri/kurye/ürün adı) basıldığı için XSS koruması. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "son görülme: X dk önce" */
function lastSeenLabel(lastSeenAt: string | null, nowMs: number): string {
  if (!lastSeenAt) return "";
  const diffMin = Math.max(0, Math.round((nowMs - new Date(lastSeenAt).getTime()) / 60000));
  return diffMin <= 0 ? "son görülme: az önce" : `son görülme: ${diffMin} dk önce`;
}

function emojiIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="font-size:24px;line-height:24px">${emoji}</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function LiveMap({ initial }: { initial: Snapshot }) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("live-map").setView([39.0, 35.0], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    function render(data: Snapshot) {
      const layer = layerRef.current!;
      layer.clearLayers();
      const pts: [number, number][] = [];
      const now = Date.now();
      for (const c of data.couriers) {
        if (c.lat == null || c.lng == null || !isCourierLive(c.lastSeenAt, now)) continue;
        L.marker([c.lat, c.lng], { icon: emojiIcon("🛵") })
          .bindPopup(`<b>${esc(c.name)}</b><br>${esc(lastSeenLabel(c.lastSeenAt, now))}`).addTo(layer);
        pts.push([c.lat, c.lng]);
      }
      for (const o of data.orders) {
        if (o.lat == null || o.lng == null) continue;
        L.marker([o.lat, o.lng], { icon: emojiIcon("🏠") })
          .bindPopup(`<b>${esc(o.customerName ?? "Müşteri")}</b><br>${esc(o.productTitle)}`).addTo(layer);
        pts.push([o.lat, o.lng]);
      }
      if (pts.length > 0) mapRef.current!.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    }

    render(initial);

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/canli-konum", { cache: "no-store" });
        if (res.ok) render(await res.json());
      } catch { /* polling best-effort */ }
    }, 15_000);

    return () => {
      clearInterval(id);
      map.remove();
      mapRef.current = null;
    };
  }, [initial]);

  return <div id="live-map" className="h-[70vh] w-full rounded-xl" />;
}
