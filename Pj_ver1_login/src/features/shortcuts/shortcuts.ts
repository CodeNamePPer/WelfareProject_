import { Bell, FileSpreadsheet, History, PackagePlus, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Shortcut {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

// "ทางลัด" – งานที่ Admin ทำบ่อย แสดงในเมนูของปุ่มลอย (ShortcutFab) ทุกหน้า Admin
export function getShortcuts(notificationCount: number | null): Shortcut[] {
  return [
    { id: 'add-benefit', label: 'เพิ่มสวัสดิการ', description: 'สร้างหรือแก้ไขรายการสวัสดิการ', icon: PackagePlus, href: '/admin/benefits' },
    { id: 'import-claims', label: 'นำเข้าประวัติขอเบิก', description: 'อัปโหลดไฟล์ CSV', icon: FileSpreadsheet, href: '/admin/benefits?tab=import' },
    { id: 'users', label: 'จัดการผู้ใช้งาน', description: 'เพิ่มผู้ใช้ กำหนดสิทธิ์ (Role)', icon: UserCog, href: '/admin/users' },
    { id: 'notifications', label: 'แจ้งเตือน', description: 'คำขอสิทธิ์และรายการใกล้หมดอายุ', icon: Bell, href: '/admin/notifications', badge: notificationCount ?? undefined },
    { id: 'logs', label: 'ประวัติการแก้ไข', description: 'ตรวจสอบ Log การใช้งานระบบ', icon: History, href: '/admin/logs' },
  ];
}
