"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function guard() {
  const session = await auth();
  if (!session) throw new Error("Yetkisiz");
}

function readLocalized(form: FormData, name: string) {
  return {
    tr: (form.get(`${name}.tr`) as string) ?? "",
    en: (form.get(`${name}.en`) as string) ?? "",
    ar: (form.get(`${name}.ar`) as string) ?? "",
  };
}

export async function createFaq(formData: FormData) {
  await guard();
  const question = readLocalized(formData, "question");
  if (!question.tr.trim()) throw new Error("Soru (TR) zorunlu");
  const count = await prisma.franchiseFaq.count();
  await prisma.franchiseFaq.create({
    data: { question, answer: readLocalized(formData, "answer"), order: count },
  });
  revalidatePath("/admin/bayilik-sss");
}

export async function deleteFaq(formData: FormData) {
  await guard();
  const id = formData.get("id") as string;
  await prisma.franchiseFaq.delete({ where: { id } });
  revalidatePath("/admin/bayilik-sss");
}
