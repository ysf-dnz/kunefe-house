import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Supabase session pooler bağlantı limiti (15) düşük; build sırasında çok dilli
  // paralel prerender'lar bunu tüketebiliyor. Havuzu küçük tutarak limit aşımını önlüyoruz.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
