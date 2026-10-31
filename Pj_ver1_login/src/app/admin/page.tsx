import { DashboardPage } from "@/features/dashboard/DashboardPage";
// TODO: claims/periods รอตารางคำขอเบิกสวัสดิการ, notifications รอตารางแจ้งเตือน
// mock claims อ้าง employeeId แบบเดิม (e3, e7, ...) จึงยังไม่ตรงกับรหัสพนักงานจริง
import { claims, notifications, periods } from "@/data/mock";
import { getAdminDashboard } from "@/lib/admin/dashboard";

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// Server Component for Admin Dashboard Overview
export default async function AdminHomePage() {
  const { stats, roleCounts, logGroups, employees } = await getAdminDashboard();

  return (
    <DashboardPage
      stats={stats}
      notifications={notifications}
      roleCounts={roleCounts}
      logGroups={logGroups}
      employees={employees}
      periods={periods}
      claims={claims}
    />
  );
}
