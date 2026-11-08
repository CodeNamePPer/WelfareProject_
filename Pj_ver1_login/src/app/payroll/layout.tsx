import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ToastProvider as PayrollToastProvider } from "@/features/payroll/components/ui/Toast";
import "./payroll.css";

export const metadata: Metadata = {
  title: { default: "การเงิน | ระบบพนักงานและสวัสดิการ", template: "%s | ระบบพนักงานและสวัสดิการ" },
  description: "จัดการรอบจ่ายและการจ่ายเงินสวัสดิการพนักงาน",
};

// Admin เห็นเฉพาะข้อมูลย้อนหลัง ตามสิทธิ์เดิมของระบบ Payroll (สิทธิ์จริงตรวจใน ROUTE_ROLES)
const ADMIN_HIDDEN_NAV = ["rounds", "approvals", "export"];

// โครงเดียวกับ /admin และ /hr; .payroll-app ครอบ payroll.css ไม่ให้กระทบส่วนอื่น
export default async function PayrollLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section="finance"
        notificationCount={0}
        hiddenNavIds={session.role === "SUPER_ADMIN" ? ADMIN_HIDDEN_NAV : undefined}
        user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role }}
      >
        <PayrollToastProvider>
          <div className="payroll-app text-13 text-ink">{children}</div>
        </PayrollToastProvider>
      </AppShell>
    </ToastProvider>
  );
}
