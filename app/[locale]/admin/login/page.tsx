import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LoginForm />;
}
