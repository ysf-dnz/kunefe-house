import type { DefaultSession } from "next-auth";

type AppRole = "HQ_ADMIN" | "BRANCH_ADMIN";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AppRole; branchId: string | null } & DefaultSession["user"];
  }
  interface User {
    role: AppRole;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: AppRole;
    branchId?: string | null;
  }
}
