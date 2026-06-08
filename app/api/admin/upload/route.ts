import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const formData = await req.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || "misc";
  if (!(file instanceof File)) return NextResponse.json({ error: "Dosya yok" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Sadece görsel yüklenebilir" }, { status: 400 });
  try {
    const url = await uploadImage(folder, file);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
