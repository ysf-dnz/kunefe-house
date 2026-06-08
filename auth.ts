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
        if (!email || !password) return null;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminHash) return null;
        if (email !== adminEmail) return null;
        const valid = await bcrypt.compare(password, adminHash);
        if (!valid) return null;
        return { id: "admin", email: adminEmail, name: "Admin" };
      },
    }),
  ],
});
