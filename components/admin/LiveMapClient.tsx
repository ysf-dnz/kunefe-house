"use client";
import dynamic from "next/dynamic";
const LiveMap = dynamic(() => import("./LiveMap").then((m) => m.LiveMap), { ssr: false });
type Snapshot = { couriers: { id: string; name: string; lat: number | null; lng: number | null; lastSeenAt: string | null }[]; orders: { id: string; lat: number | null; lng: number | null; customerName: string | null; productTitle: string }[] };
export function LiveMapClient({ initial }: { initial: Snapshot }) {
  return <LiveMap initial={initial} />;
}
