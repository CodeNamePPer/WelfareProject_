import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cancelOverdueAdvances, countClaimsForHr } from "@/lib/claims/service";
import { isHrHead } from "@/lib/hr/hrHead";
import { countHrNotifications } from "@/lib/hr/notifications";
import { countPendingEditRequests } from "@/lib/hr/editRequests";
import { countPendingProposals } from "@/lib/hr/proposals";
import { getMyProfile } from "@/lib/employee/profile";
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
  // คำขอเบิกของ HR รวมอยู่ในคิวคำขอหน้าแรกแล้ว จึงไม่มีเมนูแยก
  const headCounts = isHrHead(session).then(async (isHead) => ({ head: isHead, proposals: isHead ? await countPendingProposals() : 0 }));
  const [waiting, notifications, { head, proposals }, editRequests, profile] = await Promise.all([
    countClaimsForHr(),
    countHrNotifications(session.sub, session.role),
    headCounts,
    countPendingEditRequests().catch(() => 0),
    getMyProfile(session.sub).catch(() => null),
  ]);

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section={head ? "hr_head" : "hr"}
        notificationCount={waiting}
        badges={head ? { proposals, "edit-requests": editRequests } : { notifications, "edit-requests": editRequests }}
        user={{ name: session.name, roleLabel: head ? "หัวหน้าฝ่ายบุคคล" : (ROLE_LABELS[session.role] ?? session.role), photoUrl: profile?.photoUrl ?? null }}
      >
        <div className="hr-app">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
