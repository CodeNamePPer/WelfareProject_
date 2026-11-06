import { Bell, CircleUserRound, FileSpreadsheet, PackagePlus, UserCog } from 'lucide-react';
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
// Logs ไม่ซ้ำไว้ที่นี่เพราะเมนูข้างพาไปได้ตรง ๆ อยู่แล้ว
export function getShortcuts(notificationCount: number | null): Shortcut[] {
  return [
    { id: 'add-benefit', label: 'เพิ่มสวัสดิการ', description: 'เปิดฟอร์มสร้างรายการใหม่ทันที', icon: PackagePlus, href: '/admin/benefits?new=1' },
    { id: 'import-claims', label: 'นำเข้าประวัติขอเบิก', description: 'อัปโหลดไฟล์ CSV', icon: FileSpreadsheet, href: '/admin/benefits?tab=import' },
    { id: 'users', label: 'ตั้งค่าผู้ใช้งาน', description: 'แก้ข้อมูล สิทธิ์ (Role) และรีเซ็ตรหัสผ่าน', icon: UserCog, href: '/admin/users' },
    { id: 'notifications', label: 'แจ้งเตือน', description: 'คำขอสิทธิ์และรายการใกล้หมดอายุ', icon: Bell, href: '/admin/notifications', badge: notificationCount ?? undefined },
    { id: 'profile', label: 'โปรไฟล์ของฉัน', description: 'ข้อมูลบัญชีและเปลี่ยนรหัสผ่าน', icon: CircleUserRound, href: '/admin/profile' },
  ];
}
