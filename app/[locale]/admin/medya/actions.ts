"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { deleteMedia } from "@/lib/media";

export async function removeMedia(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
  const path = formData.get("path") as string;
  if (path) await deleteMedia(path);
  revalidatePath("/admin/medya");
}
