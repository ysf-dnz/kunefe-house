import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Kullanım: node scripts/hash-password.mjs <şifre>");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log(hash);
