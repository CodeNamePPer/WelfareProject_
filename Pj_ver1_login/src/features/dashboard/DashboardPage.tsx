'use client';

import { useRouter } from 'next/navigation';
import { ActivityLogPanel } from './ActivityLogPanel';
import { EmployeeClaimStats } from './EmployeeClaimStats';
import { NotificationPanel } from './NotificationPanel';
import { SummaryCards } from './SummaryCards';
import { UsersByRolePanel } from './UsersByRolePanel';
import type {
  AuditEntry,
  Claim,
  Employee,
  NotificationItem,
  Period,
  RoleCount,
  SummaryStats,
} from '../../types';

interface DashboardPageProps {
  stats: SummaryStats;
  notifications: NotificationItem[];
  roleCounts: RoleCount[] | null;
  logEntries: AuditEntry[];
  employees: Employee[];
  periods: Period[];
  claims: Claim[];
}

// Based on Figma "Admin / ภาพรวมและสถิติรายบุคคล" (node 163:1108); shortcuts live in the admin-wide floating button (ShortcutFab).
// Colours follow the project Style Guide (white–blue theme).
export function DashboardPage({
  stats,
  notifications,
  roleCounts,
  logEntries,
  employees,
  periods,
  claims,
}: DashboardPageProps) {
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  return (
    <div className="flex flex-col gap-[24px]">
      <header className="flex flex-col gap-[4px]">
        <h1 className="text-22 font-semibold text-ink">ภาพรวมระบบ</h1>
        <p className="text-13 text-muted">Admin · จัดการระบบได้ แต่ไม่อนุมัติคำขอเบิก</p>
      </header>

      <SummaryCards stats={stats} />

      <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-[602fr_464fr]">
        <NotificationPanel
          items={notifications}
          onReview={go('/admin/notifications')}
          onViewAll={go('/admin/notifications')}
        />
        <UsersByRolePanel roles={roleCounts} onViewAll={go('/admin/users')} onRetry={() => router.refresh()} />
      </div>

      <ActivityLogPanel entries={logEntries} onViewAll={go('/admin/logs')} />

      <EmployeeClaimStats employees={employees} periods={periods} claims={claims} />
    </div>
  );
}
