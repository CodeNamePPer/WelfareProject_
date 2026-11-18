import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { createAccountPhotoToken } from "@/lib/auth/accountPhoto";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { cancelOverdueAdvances, countClaimsToRevise } from "@/lib/claims/service";
import { countUnreadNotifications } from "@/lib/employee/notifications";
import { getMyProfile } from "@/lib/employee/profile";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { RequestFab } from "@/features/shortcuts/RequestFab";

export const metadata: Metadata = {
  title: { default: "สวัสดิการของฉัน | ระบบพนักงานและสวัสดิการ", template: "%s | ระบบพนักงานและสวัสดิการ" },
  description: "ดูสิทธิ์ ยื่นคำขอ และติดตามสถานะสวัสดิการ",
};

// ลิงก์กลับส่วนงานของตัวเอง แสดงเฉพาะบทบาทนั้น (พนักงานทั่วไปไม่มีส่วนอื่น)
const BACK_LINK_BY_ROLE: Partial<Record<Role, string>> = {
  HR: "back-hr",
  FINANCE: "back-finance",
  SUPER_ADMIN: "back-admin",
};

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // ไม่มีงานตั้งเวลาในฐานข้อมูล จึงยกเลิกเงินล่วงหน้าที่เกินกำหนดแนบใบเสร็จตอนเปิดหน้า (เว้นช่วงในตัวฟังก์ชัน)
  await cancelOverdueAdvances();

  const [todoCount, unreadCount, profile] = await Promise.all([
    countClaimsToRevise(session.sub),
    countUnreadNotifications(session.sub),
    getMyProfile(session.sub).catch(() => null),
  ]);
  const hiddenNavIds = Object.values(BACK_LINK_BY_ROLE).filter((id) => id !== BACK_LINK_BY_ROLE[session.role]);

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section="employee"
        notificationCount={todoCount}
        badges={{ notifications: unreadCount }}
        hiddenNavIds={hiddenNavIds}
        user={{ code: session.sub, photoToken: await createAccountPhotoToken(session.sub), name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role, photoUrl: profile?.photoUrl ?? null }}
      >
        {/* ความกว้างเนื้อหาและระยะห่างระหว่างส่วนตามดีไซน์ฝั่งผู้ส่งคำขอ · pb-[72px] เว้นที่ไม่ให้ปุ่มยื่นคำขอบังเนื้อหาส่วนล่าง */}
        <div className="mx-auto flex w-full max-w-[1140px] group-data-[nav=collapsed]/shell:max-w-none flex-col gap-4 pb-[72px] text-14 text-ink">{children}</div>
      </AppShell>
      <RequestFab />
    </ToastProvider>
  );
}
