import type { NextAuthConfig } from "next-auth";

/**
 * Edge-güvenli temel yapılandırma: Prisma/bcrypt İÇERMEZ.
 * middleware (edge runtime) bunu kullanır; gerçek Credentials provider
 * yalnızca Node tarafındaki auth.ts'tedir. Böylece Prisma edge bundle'a
 * girmez (node:util/types hatası önlenir).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [], // gerçek provider auth.ts'te eklenir
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: "HQ_ADMIN" | "BRANCH_ADMIN" }).role;
        token.branchId = (user as { branchId: string | null }).branchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as "HQ_ADMIN" | "BRANCH_ADMIN") ?? "BRANCH_ADMIN";
        session.user.branchId = (token.branchId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
