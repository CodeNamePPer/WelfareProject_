'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ui/Toast';
import { ActivityLogPanel } from './ActivityLogPanel';
import { EmployeeClaimStats } from './EmployeeClaimStats';
import { NotificationPanel } from './NotificationPanel';
import { ShortcutPanel } from './ShortcutPanel';
import { SummaryCards } from './SummaryCards';
import { UsersByRolePanel } from './UsersByRolePanel';
import type {
  Claim,
  Employee,
  LogGroup,
  NotificationItem,
  Period,
  RoleCount,
  SummaryStats,
} from '../../types';

interface DashboardPageProps {
  stats: SummaryStats;
  notifications: NotificationItem[];
  roleCounts: RoleCount[];
  logGroups: LogGroup[];
  employees: Employee[];
  periods: Period[];
  claims: Claim[];
}

// Layout follows Figma "Admin / ภาพรวมและสถิติรายบุคคล" (node 163:1108).
// Colours follow the project Style Guide (white–blue theme).
export function DashboardPage({
  stats,
  notifications,
  roleCounts,
  logGroups,
  employees,
  periods,
  claims,
}: DashboardPageProps) {
  const { notifyPending } = useToast();
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  return (
    <div className="flex flex-col">
      {/* Page header – Figma 163:1272 */}
      <header className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold text-ink">ภาพรวมระบบ</h1>
        <p className="text-[13px] text-muted">Admin · จัดการระบบได้ แต่ไม่อนุมัติคำขอเบิก</p>
      </header>

      {/* Summary cards – Figma 163:1146 */}
      <div className="mt-[10px]">
        <SummaryCards stats={stats} />
      </div>

      {/* Notification (602) + Users (464) – Figma 163:1169 / 163:1197 */}
      <div className="mt-[10px] grid grid-cols-1 gap-[10px] lg:grid-cols-[602fr_464fr]">
        <NotificationPanel
          items={notifications}
          onReview={go('/admin/notifications')}
          onViewAll={go('/admin/notifications')}
        />
        <UsersByRolePanel roles={roleCounts} onViewAll={go('/admin/users')} />
      </div>

      {/* Shortcut (493) + Log (564) – Figma 163:1247 / 163:1223 */}
      <div className="mt-[24px] grid grid-cols-1 gap-[20px] lg:grid-cols-[493fr_564fr]">
        <ShortcutPanel onSelect={(shortcut) => (shortcut.href ? router.push(shortcut.href) : notifyPending(shortcut.label))} />
        <ActivityLogPanel groups={logGroups} onViewAll={go('/admin/logs')} />
      </div>

      {/* Per-employee claim stats – Figma 163:1276 */}
      <div className="mt-[20px]">
        <EmployeeClaimStats employees={employees} periods={periods} claims={claims} />
      </div>
    </div>
  );
}
