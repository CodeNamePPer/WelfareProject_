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
  Eye,
  ListChecks,
  Stamp,
  Network,
  UserCog,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Screen-reader words before the badge number. Default: "ยังไม่อ่าน". */
  badgeLabel?: string;
  href?: string;
  /** Leaves the staff workspace for the requester one, so the sidebar tells the user first. */
  switchesToRequester?: boolean;
}

export type NavSection = 'admin' | 'hr' | 'hr_head' | 'employee' | 'finance';

const REQUEST_ITEM: NavItem = {
  id: 'requests',
  label: 'ยื่นคำขอสวัสดิการ',
  icon: FilePlus2,
  href: '/employee/withdraw',
  switchesToRequester: true,
};

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
      { id: 'home', label: 'หน้าแรก', icon: LayoutDashboard, href: '/admin' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, badge: notificationCount, href: '/admin/notifications' },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/admin/benefits' },
      { id: 'users', label: 'ตั้งค่าผู้ใช้งานระบบ', icon: UserCog, href: '/admin/users' },
      { id: 'logs', label: 'ประวัติของระบบ', icon: History, href: '/admin/logs' },
      REQUEST_ITEM,
    ],
  },
  // Same menu as the HR team's original sidebar (frontend-hr app/sidebar.tsx).
  hr: {
    basePath: '/hr',
    subtitle: 'HR',
    sectionLabel: 'HR',
    // หน้าโปรไฟล์ของ HR (P01 5 แท็บ) ยังไม่มี ใช้หน้าโปรไฟล์ของฉันที่มีอยู่ไปก่อน เหมือนเมนูการเงิน (ข้อ 10 จะเปลี่ยนเป็น /hr/profile)
    profileHref: '/employee/profile',
    items: (notificationCount) => [
      // ตัวเลขของ HR คือคำขอที่รอ HR ตรวจ (ดีไซน์ H01–H08)
      { id: 'home', label: 'หน้าแรก · คิวคำขอ', icon: LayoutDashboard, href: '/hr/home', badge: notificationCount, badgeLabel: 'รอตรวจ' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/hr/benefits' },
      { id: 'employees', label: 'จัดการพนักงานและสิทธิ์', icon: Users, href: '/hr/employees' },
      { id: 'reports', label: 'รายงานและสถิติ', icon: ChartColumn, href: '/hr/reports' },
      { id: 'logs', label: 'ประวัติการแก้ไข', icon: History },
      REQUEST_ITEM,
    ],
  },
  // หัวหน้า HR (ดีไซน์ HH1–HH4) ใช้เส้นทาง /hr เดียวกัน · หัวหน้า HR = หัวหน้าฝ่ายทรัพยากรบุคคล (lib/hr/hrHead.ts)
  hr_head: {
    basePath: '/hr',
    subtitle: 'หัวหน้า HR',
    sectionLabel: 'HR',
    profileHref: '/employee/profile',
    items: (notificationCount) => [
      { id: 'home', label: 'หน้าแรก · คิวคำขอ', icon: LayoutDashboard, href: '/hr/home', badge: notificationCount, badgeLabel: 'รอตรวจ' },
      { id: 'proposals', label: 'อนุมัติสวัสดิการใหม่', icon: Stamp, href: '/hr/proposals', badgeLabel: 'รออนุมัติ' },
      { id: 'hr-claims', label: 'คำขอเบิกของ HR', icon: FileText },
      { id: 'visibility', label: 'การแสดงสวัสดิการ', icon: Eye },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/hr/benefits' },
      { id: 'employees', label: 'จัดการพนักงานและสิทธิ์', icon: Users, href: '/hr/employees' },
      REQUEST_ITEM,
    ],
  },
  // Menu from design R01–R12. Proxy claims live inside ยื่นคำขอ; layout hides the back links by role.
  employee: {
    basePath: '/employee',
    subtitle: 'พนักงาน',
    sectionLabel: 'พื้นที่ของฉัน',
    profileHref: '/employee/profile',
    // The number here is how many claims wait on the requester (sent back for revision), shown on "ติดตามสถานะ".
    items: (todoCount) => [
      { id: 'home', label: 'หน้าหลัก', icon: LayoutDashboard, href: '/employee' },
      { id: 'welfare', label: 'สิทธิ์สวัสดิการ', icon: Gift, href: '/employee/welfare' },
      { id: 'withdraw', label: 'ยื่นคำขอ', icon: FilePlus2, href: '/employee/withdraw' },
      { id: 'status', label: 'ติดตามสถานะ', icon: ListChecks, href: '/employee/status', badge: todoCount, badgeLabel: 'รอคุณแก้ไข' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, href: '/employee/notifications' },
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
      REQUEST_ITEM,
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
