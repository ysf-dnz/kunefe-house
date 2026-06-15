"use server";

import { revalidatePath } from "next/cache";
import { requireHQ } from "@/lib/require-admin";
import { deleteMedia } from "@/lib/media";

export async function removeMedia(formData: FormData) {
  await requireHQ();
  const path = formData.get("path") as string;
  if (path) await deleteMedia(path);
  revalidatePath("/admin/medya");
}
