import { DashboardPage } from "@/features/dashboard/DashboardPage";
// TODO: claims/periods รอตารางคำขอเบิกสวัสดิการ
// mock claims อ้าง employeeId แบบเดิม (e3, e7, ...) จึงยังไม่ตรงกับรหัสพนักงานจริง
import { claims, periods } from "@/data/mock";
import { getAdminAlerts, toDashboardNotifications } from "@/lib/admin/alerts";
import { getAdminDashboard } from "@/lib/admin/dashboard";

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// Server Component for Admin Dashboard Overview
export default async function AdminHomePage() {
  const { stats, roleCounts, logEntries, employees } = await getAdminDashboard();

  return (
    <DashboardPage
      stats={stats}
      notifications={toDashboardNotifications(getAdminAlerts())}
      roleCounts={roleCounts}
      logEntries={logEntries}
      employees={employees}
      periods={periods}
      claims={claims}
    />
  );
}
