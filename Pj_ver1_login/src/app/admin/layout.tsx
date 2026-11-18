import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ShortcutFab } from "@/features/shortcuts/ShortcutFab";
import { countUnread, getAdminAlerts } from "@/lib/admin/alerts";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getMyProfile } from "@/lib/employee/profile";
import { AdminContent } from "@/features/admin/AdminContent";
// หน้าที่ Role อื่นมีเหมือนกันใช้ดีไซน์ C แบบ HR (ดู AdminContent)
import "../hr/hr.css";

// Shared by every Admin page: sidebar (with the signed-in user) + toast + floating shortcut button.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const [alerts, profile] = await Promise.all([getAdminAlerts(session.sub), getMyProfile(session.sub).catch(() => null)]);
  const unread = countUnread(alerts);

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell notificationCount={unread} user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role, photoUrl: profile?.photoUrl ?? null }}>
        {/* pb-[72px] เว้นที่ท้ายทุกหน้าไม่ให้ปุ่มทางลัดบังเนื้อหาส่วนล่าง */}
        <AdminContent>{children}</AdminContent>
      </AppShell>
      <ShortcutFab notificationCount={unread} />
    </ToastProvider>
  );
}
