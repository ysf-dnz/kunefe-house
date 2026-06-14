import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, request) {
        // Kaba-kuvvet koruması: IP başına 5 deneme / 5 dk (fail-open)
        const ip = clientIp(request instanceof Request ? request.headers : new Headers());
        if (!(await checkRateLimit("login", ip))) return null;
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (!email || !password || !adminEmail || !adminHash) return null;
        // Sabit-zamanlı: e-posta yanlış olsa da bcrypt compare çalıştırılır
        // (erken dönüşle kullanıcı-enumerasyon timing sızıntısını önler).
        const passwordValid = await bcrypt.compare(password, adminHash);
        const emailValid = email === adminEmail;
        if (!emailValid || !passwordValid) return null;
        return { id: "admin", email: adminEmail, name: "Admin" };
      },
    }),
  ],
});
