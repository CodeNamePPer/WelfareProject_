import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import "./hr.css";

export const metadata: Metadata = {
  title: "ข้อมูลพนักงาน | ระบบพนักงานและสวัสดิการ",
  description: "จัดการข้อมูลพนักงานและสิทธิประโยชน์สวัสดิการ",
};

// Same shell as /admin (sidebar with the signed-in user + toast), with the HR menu.
// .hr-app scopes hr.css so the HR page styles cannot affect /admin or the shared sidebar.
export default async function HrLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "HR" && session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  return (
    <ToastProvider>
      <NavigationProgress />
      {/* ยังไม่มีระบบแจ้งเตือนของ HR จึงยังไม่แสดงตัวเลข */}
      <AppShell section="hr" notificationCount={0} user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role }}>
        <div className="hr-app">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
