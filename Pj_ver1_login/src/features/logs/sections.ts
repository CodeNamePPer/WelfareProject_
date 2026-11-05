import type { AuditAction } from '../../types';

// แยกจาก LogsPage ('use client') เพื่อให้ server page อ่านค่าได้ด้วย
export type LogSection = 'people' | 'welfare' | 'system';

// แต่ละแท็บรวม action ของหมวดนั้น ชิปย่อยแยกตาม action อีกชั้น
export const SECTIONS: Record<LogSection, { label: string; filters: Array<{ id: AuditAction; label: string }> }> = {
  people: {
    label: 'ข้อมูลพนักงาน',
    filters: [
      { id: 'user-update', label: 'แก้ไขข้อมูล' },
      { id: 'role-change', label: 'เปลี่ยนบทบาท' },
    ],
  },
  welfare: {
    label: 'สวัสดิการ',
    filters: [
      { id: 'welfare', label: 'แก้ไขสวัสดิการ' },
      { id: 'import', label: 'นำเข้าข้อมูล' },
    ],
  },
  system: {
    label: 'ระบบและความปลอดภัย',
    filters: [
      { id: 'security', label: 'ความปลอดภัย' },
      { id: 'system', label: 'แจ้งปัญหาและแจ้งเตือน' },
    ],
  },
};

export const LOG_SECTIONS = Object.keys(SECTIONS) as LogSection[];

export const SECTION_OF: Record<AuditAction, LogSection> = {
  'user-update': 'people',
  'role-change': 'people',
  welfare: 'welfare',
  import: 'welfare',
  security: 'system',
  system: 'system',
};
