import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { summaryStats } from "@/data/mock";

// Shared by every Admin page: sidebar + toast.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  return (
    <ToastProvider>
      <AppShell notificationCount={summaryStats.notifications}>{children}</AppShell>
    </ToastProvider>
  );
}
