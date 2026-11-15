import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import "./payroll.css";

export const metadata: Metadata = {
  title: { default: "การเงิน | ระบบพนักงานและสวัสดิการ", template: "%s | ระบบพนักงานและสวัสดิการ" },
  description: "อนุมัติจ่าย บันทึกการโอน และจัดการรอบจ่ายสวัสดิการพนักงาน",
};

// Admin เห็นเฉพาะข้อมูลย้อนหลัง ตามสิทธิ์เดิมของระบบ Payroll (สิทธิ์จริงตรวจใน ROUTE_ROLES)
const ADMIN_HIDDEN_NAV = ["approvals", "payout", "rounds", "advances", "refunds", "export"];

/** ตัวเลขบนเมนู (ดีไซน์ F01): คำขอที่รอการเงิน (รออนุมัติ + รอจ่าย) และเบิกล่วงหน้าที่ค้างใบเสร็จ */
async function financeBadges() {
  const [claims, advances] = await Promise.all([
    supabaseAdmin.from("welfare_claim").select("id", { count: "exact", head: true }).in("status", ["pending_finance", "awaiting_payment"]).is("deleted_at", null),
    supabaseAdmin.from("welfare_claim_advance").select("id", { count: "exact", head: true }).in("status", ["awaiting_receipt", "receipt_returned"]),
  ]);
  return { approvals: claims.count ?? 0, advances: advances.count ?? 0 };
}

// โครงเดียวกับ /hr (ดีไซน์ C): คอลัมน์ 1140px พื้น #F3F4F6
export default async function PayrollLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const admin = session.role === "SUPER_ADMIN";
  const badges = admin ? undefined : await financeBadges().catch(() => undefined);

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section="finance"
        notificationCount={0}
        badges={badges}
        hiddenNavIds={admin ? ADMIN_HIDDEN_NAV : undefined}
        user={{ name: session.name, roleLabel: session.role === "FINANCE" ? "ฝ่ายการเงิน (Finance)" : (ROLE_LABELS[session.role] ?? session.role) }}
      >
        <div className="payroll-app">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
