import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { countClaimsToRevise } from "@/lib/claims/service";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/ui/NavigationProgress";

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

  const todoCount = await countClaimsToRevise(session.sub);
  const hiddenNavIds = Object.values(BACK_LINK_BY_ROLE).filter((id) => id !== BACK_LINK_BY_ROLE[session.role]);

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section="employee"
        notificationCount={todoCount}
        hiddenNavIds={hiddenNavIds}
        user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role }}
      >
        {/* ความกว้างเนื้อหาและระยะห่างระหว่างส่วนตามดีไซน์ฝั่งผู้ส่งคำขอ */}
        <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
