import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

// Kullanıcı bulunamazsa da sabit-zamanlı davranış için geçerli bir sahte bcrypt hash
const DUMMY_HASH = "$2b$10$Dziqf8owZ4IfS7x.6NzBBOhqWS5sefaRpa6eqIZAoPKw048t9p2yK";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = clientIp(request instanceof Request ? request.headers : new Headers());
        if (!(await checkRateLimit("login", ip))) return null;
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.isActive || !ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId };
      },
    }),
  ],
});
