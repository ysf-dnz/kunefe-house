import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/require-admin";
import { getTrackingSnapshot } from "@/lib/couriers";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const scope = me.role === "HQ_ADMIN" ? undefined : (me.branchId ?? "__none__");
  const data = await getTrackingSnapshot(scope);
  return NextResponse.json(data);
}
