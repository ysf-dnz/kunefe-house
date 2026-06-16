import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
await prisma.siteSettings.update({ where:{id:1}, data:{ defaultLocale:"en" }});
console.log("set en");
await prisma.$disconnect();
