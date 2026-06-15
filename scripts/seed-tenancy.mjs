import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  let merkez = await prisma.branch.findFirst({ where: { name: "Merkez" } });
  if (!merkez) {
    merkez = await prisma.branch.create({ data: { name: "Merkez", isActive: true, order: -1 } });
    console.log("Merkez şubesi oluşturuldu:", merkez.id);
  } else {
    console.log("Merkez şubesi zaten var:", merkez.id);
  }

  const o = await prisma.order.updateMany({ where: { branchId: null }, data: { branchId: merkez.id } });
  const c = await prisma.courier.updateMany({ where: { branchId: null }, data: { branchId: merkez.id } });
  console.log(`Backfill → siparişler: ${o.count}, kuryeler: ${c.count}`);

  const email = process.env.ADMIN_EMAIL;
  let hash = process.env.ADMIN_PASSWORD_HASH || "";
  hash = hash.replace(/\\\$/g, "$");
  if (email && hash) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: { email, passwordHash: hash, name: "Genel Merkez", role: "HQ_ADMIN", branchId: null, isActive: true },
      });
      console.log("HQ_ADMIN kullanıcı oluşturuldu:", email);
    } else {
      console.log("HQ kullanıcı zaten var:", email);
    }
  } else {
    console.log("UYARI: ADMIN_EMAIL/ADMIN_PASSWORD_HASH yok — HQ kullanıcı oluşturulmadı.");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
