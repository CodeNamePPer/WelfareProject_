import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ShortcutFab } from "@/features/shortcuts/ShortcutFab";
import { countUnread, getAdminAlerts } from "@/lib/admin/alerts";
import { ROLE_LABELS } from "@/lib/auth/roles";

// Shared by every Admin page: sidebar (with the signed-in user) + toast + floating shortcut button.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const unread = countUnread(await getAdminAlerts(session.sub));

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell notificationCount={unread} user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role }}>
        {/* pb-[72px] เว้นที่ท้ายทุกหน้าไม่ให้ปุ่มทางลัดบังเนื้อหาส่วนล่าง */}
        <div className="pb-[72px]">{children}</div>
      </AppShell>
      <ShortcutFab notificationCount={unread} />
    </ToastProvider>
  );
}
