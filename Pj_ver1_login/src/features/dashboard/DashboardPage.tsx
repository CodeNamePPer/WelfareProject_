'use client';

import { useRouter } from 'next/navigation';
import { ActivityLogPanel } from './ActivityLogPanel';
import { EmployeeClaimStats } from './EmployeeClaimStats';
import { NotificationPanel } from './NotificationPanel';
import { SummaryCards } from './SummaryCards';
import { UsersByRolePanel } from './UsersByRolePanel';
import { reviewHref } from '../notifications/alertVisuals';
import type {
  AdminAlert,
  AuditEntry,
  Claim,
  Employee,
  Period,
  RoleCount,
  SummaryStats,
} from '../../types';

interface DashboardPageProps {
  stats: SummaryStats;
  alerts: AdminAlert[];
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
  alerts,
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

      {/* Bento grid on 6 columns: stat cards (2×2) | notifications, then a narrow users tile | wide log table,
          then the full-width stats table. Tiles in the same row stretch to equal height. */}
      <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-6">
        <div className="min-w-0 xl:col-span-3">
          <SummaryCards stats={stats} />
        </div>
        <NotificationPanel
          className="xl:col-span-3"
          alerts={alerts}
          onReview={(alert) => router.push(reviewHref[alert.category] ?? '/admin/notifications')}
          onViewAll={go('/admin/notifications')}
        />
        <UsersByRolePanel
          className="xl:col-span-2"
          roles={roleCounts}
          onViewAll={go('/admin/users')}
          onRetry={() => router.refresh()}
        />
        <ActivityLogPanel className="xl:col-span-4" entries={logEntries} onViewAll={go('/admin/logs')} />
        <div className="min-w-0 xl:col-span-6">
          <EmployeeClaimStats employees={employees} periods={periods} claims={claims} />
        </div>
      </div>
    </div>
  );
}
