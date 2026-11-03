import { redirect } from "next/navigation";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
// TODO: claims/periods รอตารางคำขอเบิกสวัสดิการ
// mock claims อ้าง employeeId แบบเดิม (e3, e7, ...) จึงยังไม่ตรงกับรหัสพนักงานจริง
import { claims, periods } from "@/data/mock";
import { getAdminAlerts } from "@/lib/admin/alerts";
import { getSession } from "@/lib/auth/get-session";
import { getAdminDashboard } from "@/lib/admin/dashboard";

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// Server Component for Admin Dashboard Overview
export default async function AdminHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ stats, roleCounts, logEntries, employees }, alerts] = await Promise.all([
    getAdminDashboard(),
    getAdminAlerts(session.sub),
  ]);

  return (
    <DashboardPage
      stats={stats}
      alerts={alerts}
      roleCounts={roleCounts}
      logEntries={logEntries}
      employees={employees}
      periods={periods}
      claims={claims}
    />
  );
}
