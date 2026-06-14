import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTrackingSnapshot } from "@/lib/couriers";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const data = await getTrackingSnapshot();
  return NextResponse.json(data);
}
