import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Kullanım: node scripts/hash-password.mjs <şifre>");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);

// ÖNEMLİ: bcrypt hash'i `$` içerir; Next.js env yükleyicisi `$2b` gibi parçaları
// değişken referansı sanıp bozar. Bu yüzden .env'e yazarken `$` -> `\$` escape edilmeli.
const envReady = hash.replace(/\$/g, "\\$");

console.log("Ham hash:", hash);
console.log("\n.env için (kopyala):");
console.log(`ADMIN_PASSWORD_HASH="${envReady}"`);
