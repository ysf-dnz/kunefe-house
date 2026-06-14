"use client";

import { useEffect, useRef, useState } from "react";

const MIN_INTERVAL_MS = 10_000;

export function CourierTracker({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "ok" | "denied" | "unsupported">("idle");
  const lastSent = useRef(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState("ok");
        const now = Date.now();
        if (now - lastSent.current < MIN_INTERVAL_MS) return;
        lastSent.current = now;
        fetch(`/api/kurye/${token}/konum`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => { /* best-effort, watchPosition devam eder */ });
      },
      () => setState("denied"),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  const label =
    state === "ok" ? "📍 Konum paylaşılıyor ✓"
    : state === "denied" ? "Konum izni gerekli — tarayıcı ayarlarından izin verin"
    : state === "unsupported" ? "Bu cihaz konum paylaşımını desteklemiyor"
    : "Konum başlatılıyor…";

  const cls =
    state === "ok" ? "bg-green-500/15 text-green-400 border-green-500/40"
    : state === "denied" || state === "unsupported" ? "bg-red-500/15 text-red-400 border-red-500/40"
    : "bg-gold/10 text-gold border-gold/40";

  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{label}</div>;
}
