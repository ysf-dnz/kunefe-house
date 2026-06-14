import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidLatLng } from "@/lib/geo";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Flood koruması: token başına 40 POST / dk (meşru ~10sn'de bir; fail-open)
  if (!(await checkRateLimit("courierPing", token))) {
    return NextResponse.json({ error: "Çok sık" }, { status: 429 });
  }
  const courier = await prisma.courier.findUnique({ where: { token }, select: { id: true } });
  if (!courier) return NextResponse.json({ error: "Geçersiz token" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json({ error: "Geçersiz konum" }, { status: 400 });
  }

  await prisma.courier.update({
    where: { id: courier.id },
    data: { lat, lng, lastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
