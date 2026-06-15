import { randomInt } from "crypto";

const UP = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LO = "abcdefghijkmnpqrstuvwxyz";
const NU = "23456789";
const SY = "!@#$%*?";
const ALL = UP + LO + NU + SY;

function pick(set: string): string {
  return set[randomInt(set.length)];
}

/** Büyük/küçük/rakam/sembolden en az birer içeren karışık geçici şifre. */
export function generateTempPassword(len = 12): string {
  const n = Math.max(8, len);
  const chars = [pick(UP), pick(LO), pick(NU), pick(SY)];
  while (chars.length < n) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
