import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChartColumn,
  FilePlus2,
  FileSpreadsheet,
  Gift,
  History,
  LayoutDashboard,
  Eye,
  ListChecks,
  Stamp,
  Network,
  UserCog,
  UserPen,
  Users,
  Wallet,
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
    // โปรไฟล์ของ HR (ดีไซน์ P01 5 แท็บ)
    profileHref: '/hr/profile',
    items: (notificationCount) => [
      // ตัวเลขของ HR คือคำขอที่รอ HR ตรวจ (ดีไซน์ H01–H08)
      { id: 'home', label: 'หน้าแรก · คิวคำขอ', icon: LayoutDashboard, href: '/hr/home', badge: notificationCount, badgeLabel: 'รอตรวจ' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, href: '/hr/notifications' },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/hr/benefits' },
      { id: 'employees', label: 'จัดการพนักงานและสิทธิ์', icon: Users, href: '/hr/employees' },
      // คำขอแก้ไขข้อมูลพนักงาน (H12) ผู้ใช้ขอให้อยู่ในเมนูแทนแท็บในหน้าจัดการพนักงาน
      { id: 'edit-requests', label: 'คำขอแก้ไขข้อมูล', icon: UserPen, href: '/hr/employees?tab=edits', badgeLabel: 'รอตรวจ' },
      { id: 'reports', label: 'รายงานและสถิติ', icon: ChartColumn, href: '/hr/reports' },
      { id: 'logs', label: 'ประวัติการแก้ไข', icon: History, href: '/hr/logs' },
      REQUEST_ITEM,
    ],
  },
  // หัวหน้า HR (ดีไซน์ HH1–HH4) ใช้เส้นทาง /hr เดียวกัน · หัวหน้า HR = หัวหน้าฝ่ายทรัพยากรบุคคล (lib/hr/hrHead.ts)
  hr_head: {
    basePath: '/hr',
    subtitle: 'หัวหน้า HR',
    sectionLabel: 'HR',
    profileHref: '/hr/profile',
    items: (notificationCount) => [
      { id: 'home', label: 'หน้าแรก · คิวคำขอ', icon: LayoutDashboard, href: '/hr/home', badge: notificationCount, badgeLabel: 'รอตรวจ' },
      { id: 'proposals', label: 'อนุมัติสวัสดิการใหม่', icon: Stamp, href: '/hr/proposals', badgeLabel: 'รออนุมัติ' },
      { id: 'visibility', label: 'การแสดงสวัสดิการ', icon: Eye, href: '/hr/visibility' },
      { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/hr/benefits' },
      { id: 'employees', label: 'จัดการพนักงานและสิทธิ์', icon: Users, href: '/hr/employees' },
      { id: 'edit-requests', label: 'คำขอแก้ไขข้อมูล', icon: UserPen, href: '/hr/employees?tab=edits', badgeLabel: 'รอตรวจ' },
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
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, href: '/employee/notifications', badgeLabel: 'ยังไม่อ่าน' },
      { id: 'organization', label: 'โครงสร้างองค์กร', icon: Network, href: '/employee/organization' },
      { id: 'back-hr', label: 'กลับไปหน้า HR', icon: ArrowLeft, href: '/hr' },
      { id: 'back-finance', label: 'กลับไปหน้าการเงิน', icon: ArrowLeft, href: '/payroll' },
      { id: 'back-admin', label: 'กลับไปหน้า Admin', icon: ArrowLeft, href: '/admin' },
    ],
  },
  // เมนูตามดีไซน์ F01–F09 · ตัวเลข: approvals = รออนุมัติ + รอจ่าย, advances = ค้างใบเสร็จ (ส่งผ่าน badges)
  finance: {
    basePath: '/payroll',
    subtitle: 'การเงิน',
    sectionLabel: 'PAYROLL',
    profileHref: '/employee/profile',
    items: () => [
      { id: 'approvals', label: 'รายการอนุมัติ / รอจ่าย', icon: FilePlus2, href: '/payroll/approvals', badgeLabel: 'รอดำเนินการ' },
      { id: 'payout', label: 'บันทึกการโอน', icon: Wallet, href: '/payroll/payout' },
      { id: 'rounds', label: 'ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย', icon: CalendarDays, href: '/payroll/rounds' },
      { id: 'advances', label: 'เบิกล่วงหน้า / ค้างใบเสร็จ', icon: Wallet, href: '/payroll/advances', badgeLabel: 'ค้างใบเสร็จ' },
      { id: 'refunds', label: 'เงินที่ต้องคืน', icon: History, href: '/payroll/refunds' },
      { id: 'export', label: 'Export รายงาน (Excel)', icon: FileSpreadsheet, href: '/payroll/export' },
      { id: 'history', label: 'ดูข้อมูลย้อนหลัง', icon: History, href: '/payroll/history' },
      REQUEST_ITEM,
    ],
  },
};

/** Menu id for the current path: '/admin' -> 'home', '/admin/users/x' -> 'users', '/hr/home/approved' -> 'home'. */
/** หน้าย่อยที่มีเมนูของตัวเอง (ไม่ใช้ส่วนแรกของ path เป็นเมนูที่เลือก) */
const SUBPAGE_NAV: Record<string, string> = { '/hr/employees/requests': 'edit-requests' };

export function activeNavId(section: NavSection, pathname: string | null): string {
  const { basePath } = NAV[section];
  if (!pathname) return '';
  const subpage = Object.keys(SUBPAGE_NAV).find((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (subpage) return SUBPAGE_NAV[subpage];
  if (pathname === basePath) return 'home';
  if (!pathname.startsWith(basePath + '/')) return '';
  return pathname.slice(basePath.length + 1).split('/')[0] ?? '';
}

// หน้าของ Admin ที่ Role อื่นมีเหมือนกัน (แจ้งเตือน สวัสดิการ ประวัติ โปรไฟล์) ใช้ดีไซน์ C แบบ HR
// หน้าแรกและตั้งค่าผู้ใช้ของ Admin มีเฉพาะ Admin จึงคงแบบ Figma
const ADMIN_DESIGN_C = ['/admin/notifications', '/admin/benefits', '/admin/logs', '/admin/profile'];

// คำขอเบิกทั้งหมดมีเฉพาะ Admin (ตาราง Figma เดิม) จึงไม่ใช้ดีไซน์ C
const ADMIN_FIGMA = ['/admin/benefits/claims'];

export function isAdminDesignC(pathname: string | null): boolean {
  if (ADMIN_FIGMA.some((path) => pathname === path || Boolean(pathname?.startsWith(`${path}/`)))) return false;
  return ADMIN_DESIGN_C.some((path) => pathname === path || Boolean(pathname?.startsWith(`${path}/`)));
}
