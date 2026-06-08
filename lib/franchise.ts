import { cache } from "react";
import { prisma } from "./prisma";

export const getFranchiseFaqs = cache(async () => {
  return prisma.franchiseFaq.findMany({ orderBy: { order: "asc" } });
});

export const getApplications = cache(async () => {
  return prisma.franchiseApplication.findMany({ orderBy: { createdAt: "desc" } });
});
