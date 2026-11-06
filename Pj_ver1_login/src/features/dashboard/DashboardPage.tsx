'use client';

import { useRouter } from 'next/navigation';
import { ActivityLogPanel } from './ActivityLogPanel';
import { EmployeeClaimStats } from './EmployeeClaimStats';
import { NotificationPanel } from './NotificationPanel';
import { SummaryCards } from './SummaryCards';
import { UsersByRolePanel } from './UsersByRolePanel';
import { useToast } from '../../components/ui/Toast';
import { updateAlert } from '../notifications/api';
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
  const { notify } = useToast();
  const go = (href: string) => () => router.push(href);

  // กดตรวจสอบ = ปิดงานนั้นในฐานข้อมูล แล้วรีเฟรชตัวเลขแจ้งเตือนใน sidebar
  const review = (alert: AdminAlert) => {
    updateAlert({ action: 'resolve', id: alert.id })
      .then(() => router.refresh())
      .catch((err: Error) => notify(err.message));
    router.push(reviewHref[alert.category] ?? '/admin/notifications');
  };

  return (
    <div className="flex flex-col gap-[24px]">
      <header className="flex flex-col gap-[4px]">
        <h1 className="text-22 font-semibold text-ink">ภาพรวมระบบ</h1>
        <p className="text-13 text-muted">ดูแลระบบและติดตามคิว HR ส่วนการอนุมัติคำขอเบิกเป็นงานของ HR</p>
      </header>

      {/* ตำแหน่งตาม Figma (6 คอลัมน์): สรุป 2×2 | แจ้งเตือน, ผู้ใช้ | ประวัติ, แล้วสถิติรายบุคคลเต็มแถว
          แต่วาดเป็นแผ่นเดียว: ขอบนอกเส้นเดียว ส่วนต่างๆ ใช้เส้นแบ่งร่วมกัน (gap-px บนพื้นสีเส้น) ไม่ใช่การ์ดแยกใบ */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line xl:grid-cols-6">
        <div className="min-w-0 bg-white xl:col-span-3">
          <SummaryCards stats={stats} />
        </div>
        <NotificationPanel
          className="xl:col-span-3"
          alerts={alerts}
          onReview={review}
          onViewAll={go('/admin/notifications')}
        />
        <UsersByRolePanel
          className="xl:col-span-2"
          roles={roleCounts}
          onViewAll={go('/admin/users')}
          onRetry={() => router.refresh()}
        />
        <ActivityLogPanel className="xl:col-span-4" entries={logEntries} onViewAll={go('/admin/logs')} />
        <div className="min-w-0 bg-white xl:col-span-6">
          <EmployeeClaimStats employees={employees} periods={periods} claims={claims} />
        </div>
      </div>
    </div>
  );
}
