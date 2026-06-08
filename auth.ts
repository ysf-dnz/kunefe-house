import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
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
