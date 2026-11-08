// Mock data only. Replace with API calls when the database is connected.
import type {
  AuditEntry,
  ImportRecord,
  NotificationItem,
  RoleCount,
  SystemUser,
} from '../types';

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'access-request',
    title: 'คำขอสิทธิ์ HR Recruiter',
    description: 'สมชาย ใจดี ขอสิทธิ์เข้าถึงโมดูลสรรหา',
    time: '5 นาทีที่แล้ว',
    unread: true,
    actionLabel: 'ตรวจสอบ',
  },
  {
    id: 'n2',
    kind: 'access-request',
    title: 'คำขอสร้างสวัสดิการใหม่จาก HR',
    description: 'วิภา สุขสันต์ ขอเพิ่มสวัสดิการ "ค่าตรวจสุขภาพประจำปี"',
    time: '32 นาทีที่แล้ว',
    unread: true,
    actionLabel: 'ตรวจสอบ',
  },
  {
    id: 'n3',
    kind: 'expiring',
    title: 'สิทธิ์รักษาการใกล้หมดอายุ',
    description: 'เหลือ 2 วัน',
    time: '1 ชั่วโมงที่แล้ว',
    unread: true,
  },
];

export const roleCounts: RoleCount[] = [
  { id: 'hr', role: 'HR', count: 6 },
  { id: 'finance', role: 'การเงิน', count: 4 },
  { id: 'employee', role: 'พนักงานทั่วไป', count: 118 },
];

// ─── ข้อมูลผู้ใช้งานระบบ (Mock) ────────────────────────────────────────────
export const systemUsers: SystemUser[] = [
  {
    employeeId: 'E00001',
    email: 'somchai.j@company.co.th',
    name: 'สมชาย ใจดี',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T08:12:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    employeeId: 'E00003',
    email: 'vipa.s@company.co.th',
    name: 'วิภา สุขสันต์',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T14:05:00Z',
    updatedAt: '2026-09-15T11:30:00Z',
  },
  {
    employeeId: 'E00007',
    email: 'thanakorn.s@company.co.th',
    name: 'ธนากร แสงทอง',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-29T09:45:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  },
  {
    employeeId: 'E00012',
    email: 'pimchanok.r@company.co.th',
    name: 'พิมพ์ชนก รัตนวงศ์',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T07:30:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
  {
    employeeId: 'E00021',
    email: 'anon.k@company.co.th',
    name: 'อานนท์ กาญจนา',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-28T13:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    employeeId: 'E00034',
    email: 'nipa.w@company.co.th',
    name: 'นิภา วิชิต',
    role: 'EMPLOYEE',
    status: 'RESIGNED',
    lastLoginAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-10T15:00:00Z',
  },
  {
    employeeId: 'E00042',
    email: 'finance2@company.co.th',
    name: 'ประเสริฐ มั่งมี',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T10:20:00Z',
    updatedAt: '2026-10-05T09:30:00Z',
  },
  {
    employeeId: 'E00055',
    email: 'hr3@company.co.th',
    name: 'จิตรา สวยงาม',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T09:00:00Z',
    updatedAt: '2026-10-15T14:00:00Z',
  },
];

/** Sample rows shown as the import preview until file parsing is connected to the backend. */
export const importPreview: ImportRecord[] = [
  { id: 'IMP-001', date: '2026-10-10', benefit: 'ค่าเครื่องมือ AI สำหรับพนักงาน', claimant: 'วรางคณา', amount: 6000, status: 'approved' },
  { id: 'IMP-002', date: '2026-10-09', benefit: 'ค่าออกกำลังกาย / ฟิตเนส', claimant: 'สุพัตรา', amount: 12000, status: 'approved' },
  { id: 'IMP-003', date: '2026-10-07', benefit: 'ค่าตัดแว่นสายตา', claimant: 'วรางคณา', amount: 3000, status: 'approved' },
  { id: 'IMP-004', date: '2026-10-03', benefit: 'วัคซีนไข้หวัดใหญ่', claimant: 'สุพัตรา', amount: 1500, status: 'approved' },
  { id: 'IMP-005', date: '2026-09-30', benefit: 'ทุนอบรมหลักสูตรภายนอก', claimant: 'วรางคณา', amount: 20000, status: 'needs-fix' },
  { id: 'IMP-006', date: '2026-09-26', benefit: 'ค่าเดินทางมาทำงาน', claimant: 'สุพัตรา', amount: 9600, status: 'rejected' },
  { id: 'IMP-007', date: '2026-09-20', benefit: 'ค่าฝากครรภ์ / คลอดบุตร', claimant: 'วรางคณา', amount: 25000, status: 'approved' },
];

// ─── ประวัติการแก้ไข Log (Mock) ────────────────────────────────────────────
// หน้า /admin/logs อ่านจาก Supabase แล้ว · ชุดนี้ใช้เฉพาะแท็บประวัติในหน้าจัดการสวัสดิการ จนกว่าตารางสวัสดิการจะเขียน log จริง
const ADMIN_SOMCHAI = 'สมชาย ใจดี (E00001)';
const ADMIN_VIPA = 'วิภา สุขสันต์ (E00003)';
const userHref = (code: string) => `/admin/users?user=${code}`;

export const auditEntries: AuditEntry[] = [
  {
    id: 'g1', at: '2026-10-10T19:00', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'เปลี่ยนบทบาทของ สมชาย ดีใจมาก', detail: 'บทบาท',
    category: 'settings', action: 'role-change',
    target: { code: 'E00002', name: 'สมชาย ดีใจมาก', href: userHref('E00002') },
    change: { fields: [{ label: 'บทบาท', before: 'พนักงาน', after: 'ฝ่ายบุคคล (HR)' }], reason: 'ย้ายทีม' },
  },
  {
    id: 'g2', at: '2026-10-10T18:40', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'เพิ่มสวัสดิการใหม่', detail: 'ใช้กับแผนก IT',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-001', name: 'ค่าเครื่องมือ AI สำหรับพนักงาน' },
    change: {
      fields: [
        { label: 'วงเงิน', before: '—', after: '฿500/เดือน' },
        { label: 'ผู้มีสิทธิ์', before: '—', after: 'พนักงานประจำ แผนก IT' },
        { label: 'มีผลตั้งแต่', before: '—', after: '1 พ.ย. 2569' },
      ],
      reason: 'นโยบายสนับสนุนการใช้ AI',
    },
  },
  {
    id: 'g3', at: '2026-10-10T17:15', actor: 'ระบบ', actorRole: 'ระบบ', ip: '203.0.113.48',
    title: 'ล็อกบัญชีอัตโนมัติ', detail: 'ล็อกอินผิด 5 ครั้ง',
    category: 'issue', action: 'security',
    target: { code: 'E00012', name: 'พิมพ์ชนก รัตนวงศ์', href: userHref('E00012') },
    change: { fields: [{ label: 'สถานะบัญชี', before: 'ใช้งาน', after: 'ถูกล็อก 30 นาที' }] },
  },
  {
    id: 'g4', at: '2026-10-10T09:05', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แจ้ง Error', detail: 'ระบบล่ม',
    category: 'issue', action: 'system',
  },
  {
    id: 'g5', at: '2026-10-09T15:30', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ประวัติเบิก ก.ย. 2569',
    category: 'import', action: 'import', result: 'partial',
    importSummary: { file: 'import_sep.csv', total: 7, success: 5, failed: 2 },
  },
  {
    id: 'g6', at: '2026-10-09T11:20', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'ปรับวงเงินสวัสดิการ', detail: 'วงเงิน, วันที่มีผล',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-002', name: 'ค่าออกกำลังกาย / ฟิตเนส' },
    change: {
      fields: [
        { label: 'วงเงิน', before: '฿10,000/ปี', after: '฿12,000/ปี' },
        { label: 'มีผลตั้งแต่', before: '1 ม.ค. 2569', after: '1 ม.ค. 2570' },
      ],
      reason: 'ปรับตามอัตราตลาด',
    },
  },
  {
    id: 'g7', at: '2026-10-08T16:45', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แก้ไขข้อมูลผู้ใช้ นันทพร เจริญสุข', detail: 'อีเมล',
    category: 'settings', action: 'user-update',
    target: { code: 'E00004', name: 'นันทพร เจริญสุข', href: userHref('E00004') },
    change: { fields: [{ label: 'อีเมล', before: 'nanthaporn@qmail.com', after: 'nannaporn@qmail.com' }], reason: 'สะกดผิด' },
  },
  {
    id: 'g8', at: '2026-10-07T10:10', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แก้ไขข้อมูลผู้ใช้ พงศกร วงศ์สวัสดิ์', detail: 'สถานะ',
    category: 'settings', action: 'user-update',
    target: { code: 'E00005', name: 'พงศกร วงศ์สวัสดิ์', href: userHref('E00005') },
    change: { fields: [{ label: 'สถานะ', before: 'ทำงานอยู่', after: 'ลาออก' }], reason: 'ลาออกมีผล 30 ก.ย. 69' },
  },
  {
    id: 'g9', at: '2026-09-28T14:00', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ประวัติเบิก ส.ค. 2569',
    category: 'import', action: 'import',
    importSummary: { file: 'import_aug.csv', total: 12, success: 12, failed: 0 },
  },
  {
    id: 'g13', at: '2026-09-27T09:40', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ไฟล์ไม่ตรงรูปแบบ (ไม่พบคอลัมน์ "รหัสพนักงาน")',
    category: 'import', action: 'import', result: 'failed',
    importSummary: { file: 'import_aug_v1.xlsx', total: 12, success: 0, failed: 12 },
  },
  {
    id: 'g10', at: '2026-09-15T09:30', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'ปิดใช้สวัสดิการ', detail: 'สถานะ',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-008', name: 'ค่าอาหารกลางวัน' },
    change: { fields: [{ label: 'สถานะ', before: 'ใช้งาน', after: 'หยุดใช้' }], reason: 'รวมเข้ากับค่าครองชีพ' },
  },
  {
    id: 'g11', at: '2026-09-02T13:25', actor: 'ระบบ', actorRole: 'ระบบ',
    title: 'แจ้งปัญหาหน้าเว็บโหลดช้า', detail: 'หน้า ส่งคำขอสวัสดิการ',
    category: 'issue', action: 'system',
  },
  {
    id: 'g12', at: '2025-12-20T10:00', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้ารายชื่อพนักงานใหม่', detail: 'พนักงานใหม่ 3 คน',
    category: 'import', action: 'import',
    importSummary: { file: 'new_hires.csv', total: 3, success: 3, failed: 0 },
  },
];
