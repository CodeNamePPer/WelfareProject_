import { DashboardPage } from "@/features/dashboard/DashboardPage";
import {
  claims,
  employees,
  logGroups,
  notifications,
  periods,
  roleCounts,
  summaryStats,
} from "@/data/mock";

// Server Component for Admin Dashboard Overview
export default function AdminHomePage() {
  return (
    <DashboardPage
      stats={summaryStats}
      notifications={notifications}
      roleCounts={roleCounts}
      logGroups={logGroups}
      employees={employees}
      periods={periods}
      claims={claims}
    />
  );
}
