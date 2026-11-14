import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { countClaimsForHr } from "@/lib/claims/service";
import { isHrHead } from "@/lib/hr/hrHead";
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
  if (session.role !== "HR" && session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const [waiting, head] = await Promise.all([countClaimsForHr(), isHrHead(session)]);
  // หัวหน้า HR เห็นเมนูของหัวหน้า HR พร้อมจำนวนข้อเสนอที่รออนุมัติ
  const proposals = head ? await countPendingProposals() : 0;

  return (
    <ToastProvider>
      <NavigationProgress />
      <AppShell
        section={head ? "hr_head" : "hr"}
        notificationCount={waiting}
        badges={head ? { proposals } : undefined}
        user={{ name: session.name, roleLabel: head ? "หัวหน้าฝ่ายบุคคล" : (ROLE_LABELS[session.role] ?? session.role) }}
      >
        <div className="hr-app">{children}</div>
      </AppShell>
    </ToastProvider>
  );
}
