import {
  Bell,
  ChartColumn,
  FilePlus2,
  Gift,
  History,
  LayoutDashboard,
  UserCog,
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

export type NavSection = 'admin' | 'hr';

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
      { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2 },
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
      { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2 },
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
