import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cancelOverdueAdvances, countClaimsForHr } from "@/lib/claims/service";
import { isHrHead } from "@/lib/hr/hrHead";
import { countHrClaimsForHead } from "@/lib/hr/hrClaims";
import { countHrNotifications } from "@/lib/hr/notifications";
import { countPendingProposals } from "@/lib/hr/proposals";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import "./hr.css";

export const metadata: Metadata = {
  title: { default: "HR | ระบบพนักงานและสวัสดิการ", template: "%s | ระบบพนักงานและสวัสดิการ" },
  description: "จัดการข้อมูลพนักงานและสิทธิประโยชน์สวัสดิการ",
};

// Same shell as /admin (sidebar with the signed-in user + toast), with the HR menu.
// .hr-app scopes hr.css so the HR page styles cannot affect /admin or the shared sidebar.
export default async function HrLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // ไม่มีงานตั้งเวลาในฐานข้อมูล จึงยกเลิกเงินล่วงหน้าที่เกินกำหนดแนบใบเสร็จตอนเปิดหน้า (เว้นช่วงในตัวฟังก์ชัน)
  await cancelOverdueAdvances();
  if (session.role !== "HR" && session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  // หัวหน้า HR เห็นเมนูของหัวหน้า HR พร้อมจำนวนข้อเสนอที่รออนุมัติ – นับต่อทันทีที่รู้ว่าเป็นหัวหน้า ไม่ต้องรอตัวนับอื่น
  const headCounts = isHrHead(session).then(async (isHead) => ({
    head: isHead,
    counts: isHead ? await Promise.all([countPendingProposals(), countHrClaimsForHead(session.sub)]) : ([0, 0] as const),
  }));
  const [waiting, notifications, { head, counts }] = await Promise.all([countClaimsForHr(), countHrNotifications(session.sub, session.role), headCounts]);
  const [proposals, hrClaims] = counts;

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section={head ? "hr_head" : "hr"}
        notificationCount={waiting}
        badges={head ? { proposals, "hr-claims": hrClaims } : { notifications }}
        user={{ name: session.name, roleLabel: head ? "หัวหน้าฝ่ายบุคคล" : (ROLE_LABELS[session.role] ?? session.role) }}
      >
        <div className="hr-app">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
