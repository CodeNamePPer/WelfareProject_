import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChartColumn,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  ListChecks,
  Network,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  href?: string;
}

export type NavSection = 'admin' | 'hr' | 'employee' | 'finance';

const REQUEST_HREF = '/employee/withdraw';

interface SectionConfig {
  /** Route prefix of the section. The first segment after it is the active menu id ('home' at the prefix itself). */
  basePath: string;
  /** Small line under the system name in the sidebar header. */
  subtitle: string;
  /** Uppercase label above the menu. */
  sectionLabel: string;
  /** Where the signed-in user block links to. No page yet -> rendered as plain text. */
  profileHref?: string;
  items: (notificationCount: number) => NavItem[];
}

// Icons are components, so the menus live in this module (imported by the client Sidebar)
// and server layouts pick one by name instead of passing items across the server/client boundary.
export const NAV: Record<NavSection, SectionConfig> = {
  admin: {
    basePath: '/admin',
    subtitle: 'Admin',
    sectionLabel: 'ADMIN',
    profileHref: '/admin/profile',
    items: (notificationCount) => [
      { id: 'home', label: 'หน้าแรก Home', icon: LayoutDashboard, href: '/admin' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, badge: notificationCount, href: '/admin/notifications' },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/admin/benefits' },
      { id: 'users', label: 'ตั้งค่าผู้ใช้งานระบบ', icon: UserCog, href: '/admin/users' },
      { id: 'logs', label: 'ประวัติของระบบ Logs', icon: History, href: '/admin/logs' },
      { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2, href: REQUEST_HREF },
    ],
  },
  // Same menu as the HR team's original sidebar (frontend-hr app/sidebar.tsx).
  hr: {
    basePath: '/hr',
    subtitle: 'HR',
    sectionLabel: 'HR',
    items: (notificationCount) => [
      { id: 'home', label: 'หน้าแรก Home', icon: LayoutDashboard, href: '/hr/home' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, badge: notificationCount },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/hr/benefits' },
      { id: 'employees', label: 'จัดการพนักงานและสิทธิ์', icon: Users, href: '/hr/employees' },
      { id: 'reports', label: 'รายงานและสถิติ', icon: ChartColumn, href: '/hr/reports' },
      { id: 'logs', label: 'ประวัติการแก้ไข Log', icon: History },
      { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2, href: REQUEST_HREF },
    ],
  },
  // Same menu as the applicant team's original sidebar. Layout hides HeadEm and the back links by user.
  employee: {
    basePath: '/employee',
    subtitle: 'พนักงาน',
    sectionLabel: 'พื้นที่ของฉัน',
    profileHref: '/employee/profile',
    items: () => [
      { id: 'home', label: 'ภาพรวมสวัสดิการของฉัน', icon: LayoutDashboard, href: '/employee' },
      { id: 'welfare', label: 'สิทธิ์สวัสดิการ', icon: Gift, href: '/employee/welfare' },
      { id: 'withdraw', label: 'ยื่นคำขอสวัสดิการ', icon: FileText, href: '/employee/withdraw' },
      { id: 'HeadEm', label: 'ยื่นคำขอสวัสดิการแทนพนักงาน', icon: UserPlus, href: '/employee/HeadEm' },
      { id: 'status', label: 'ติดตามสถานะ', icon: ListChecks, href: '/employee/status' },
      { id: 'organization', label: 'โครงสร้างองค์กร', icon: Network, href: '/employee/organization' },
      { id: 'back-hr', label: 'กลับไปหน้า HR', icon: ArrowLeft, href: '/hr' },
      { id: 'back-finance', label: 'กลับไปหน้าการเงิน', icon: ArrowLeft, href: '/payroll' },
      { id: 'back-admin', label: 'กลับไปหน้า Admin', icon: ArrowLeft, href: '/admin' },
    ],
  },
  // Same menu as the payroll team's original sidebar.
  finance: {
    basePath: '/payroll',
    subtitle: 'การเงิน',
    sectionLabel: 'PAYROLL',
    profileHref: '/employee/profile',
    items: () => [
      { id: 'rounds', label: 'ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย', icon: CalendarDays, href: '/payroll/rounds' },
      { id: 'approvals', label: 'ดูรายการอนุมัติ / รอจ่าย', icon: FileText, href: '/payroll/approvals' },
      { id: 'export', label: 'Export รายงาน (Excel)', icon: FileSpreadsheet, href: '/payroll/export' },
      { id: 'history', label: 'ดูข้อมูลย้อนหลัง', icon: History, href: '/payroll/history' },
      { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2, href: REQUEST_HREF },
    ],
  },
};

/** Menu id for the current path: '/admin' -> 'home', '/admin/users/x' -> 'users', '/hr/home/approved' -> 'home'. */
export function activeNavId(section: NavSection, pathname: string | null): string {
  const { basePath } = NAV[section];
  if (!pathname) return '';
  if (pathname === basePath) return 'home';
  if (!pathname.startsWith(basePath + '/')) return '';
  return pathname.slice(basePath.length + 1).split('/')[0] ?? '';
}
