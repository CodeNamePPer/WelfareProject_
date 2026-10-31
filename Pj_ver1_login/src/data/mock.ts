// Mock data only. Replace with API calls when the database is connected.
import type {
  AdminAlert,
  AuditEntry,
  Claim,
  ImportRecord,
  WelfareItem,
  Employee,
  LogGroup,
  NotificationItem,
  Period,
  RoleCount,
  SummaryStats,
  SystemUser,
} from '../types';

export const summaryStats: SummaryStats = {
  totalUsers: 128,
  newUsersThisCycle: 3,
  hrRequests: 2,
  notifications: 12,
  systemErrors: 0,
};

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

export const logGroups: LogGroup[] = [
  {
    label: 'วันนี้',
    entries: [
      {
        id: 'l0',
        kind: 'permission',
        title: 'อนุมัติสิทธิ์ HR Recruiter',
        detail: 'Admin สมชาย อนุมัติคำขอของ ธนากร แสงทอง',
        time: '09:42 น.',
        change: { before: 'พนักงานทั่วไป', after: 'HR Recruiter' },
      },
    ],
  },
  {
    label: 'เมื่อวาน',
    entries: [
      {
        id: 'l1',
        kind: 'permission',
        title: 'ปรับสิทธิ์ผู้ใช้งานแล้ว',
        detail: 'Admin สมชาย มอบหมาย HR Manager ให้ วิภา สุขสันต์',
        time: '16:20 น.',
        change: { before: 'HR', after: 'HR Manager' },
      },
      {
        id: 'l2',
        kind: 'system',
        title: 'ประกาศจากระบบ',
        detail: 'มีการปรับปรุงระบบคืนวันเสาร์',
        time: '10:05 น.',
      },
    ],
  },
];

export const employees: Employee[] = [
  { id: 'e3', code: 'E00003', name: 'สมชาย ใจดี' },
  { id: 'e7', code: 'E00007', name: 'วิภา สุขสันต์' },
  { id: 'e12', code: 'E00012', name: 'ธนากร แสงทอง' },
  { id: 'e21', code: 'E00021', name: 'พิมพ์ชนก รัตนวงศ์' },
];

export const periods: Period[] = [
  { id: '2026-10', label: '1 ต.ค. – 31 ต.ค. 2569', from: '2026-10-01', to: '2026-10-31' },
  { id: '2026-09', label: '1 ก.ย. – 30 ก.ย. 2569', from: '2026-09-01', to: '2026-09-30' },
  { id: '2026', label: 'ทั้งปี 2569', from: '2026-01-01', to: '2026-12-31' },
];

export const claims: Claim[] = [
  { id: 'c1', employeeId: 'e3', benefit: 'ผู้ป่วยนอก', amount: 1850, status: 'approved', date: '2026-10-08' },
  { id: 'c2', employeeId: 'e3', benefit: 'สวัสดิการใช้จ่าย', amount: 1200, status: 'approved', date: '2026-10-14' },
  { id: 'c3', employeeId: 'e3', benefit: 'ทันตกรรม', amount: 2400, status: 'pending', date: '2026-10-21' },
  { id: 'c4', employeeId: 'e3', benefit: 'ผู้ป่วยนอก', amount: 650, status: 'rejected', date: '2026-10-27' },
  { id: 'c5', employeeId: 'e3', benefit: 'ทุนการศึกษา', amount: 18000, status: 'approved', date: '2026-09-12' },
  { id: 'c6', employeeId: 'e7', benefit: 'ผู้ป่วยใน', amount: 14500, status: 'approved', date: '2026-10-03' },
  { id: 'c7', employeeId: 'e7', benefit: 'ค่าลิขสิทธิ์', amount: 9900, status: 'pending', date: '2026-10-25' },
  { id: 'c8', employeeId: 'e12', benefit: 'สวัสดิการใช้จ่าย', amount: 3000, status: 'approved', date: '2026-10-02' },
  { id: 'c9', employeeId: 'e12', benefit: 'ผู้ป่วยนอก', amount: 1200, status: 'pending', date: '2026-10-29' },
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

// ─── การแจ้งเตือน (Mock) ────────────────────────────────────────────────────
export const adminAlerts: AdminAlert[] = [
  { id: 'a1', category: 'welfare', title: 'เพิ่มสวัสดิการแล้ว', description: 'สมชาย ใจดี เพิ่มสวัสดิการ AI ให้แผนกต่าง ๆ', time: '5 นาทีที่แล้ว', daysAgo: 0, unread: true, actionable: true },
  { id: 'a2', category: 'security', title: 'ล็อกอินผิดซ้ำ 5 ครั้ง', description: 'บัญชี hr.payroll', time: '32 นาทีที่แล้ว', daysAgo: 0, unread: true, actionable: true },
  { id: 'a3', category: 'expiring', title: 'สิทธิ์รักษาการใกล้หมดอายุ', description: 'เหลือ 2 วัน', time: '1 ชั่วโมงที่แล้ว', daysAgo: 0, unread: true, actionable: false },
  { id: 'a4', category: 'access', title: 'คำขอสิทธิ์ HR Recruiter', description: 'ธนากร แสงทอง ขอสิทธิ์เข้าถึงโมดูลสรรหา', time: '3 ชั่วโมงที่แล้ว', daysAgo: 0, unread: true, actionable: true },
  { id: 'a5', category: 'access', title: 'ปรับสิทธิ์ผู้ใช้งานแล้ว', description: 'Admin สมชาย มอบหมาย HR Manager ให้ วิภา สุขสันต์', time: 'เมื่อวาน', daysAgo: 1, unread: false, actionable: false },
  { id: 'a6', category: 'system', title: 'ประกาศจากระบบ', description: 'มีการปรับปรุงระบบคืนวันเสาร์', time: 'เมื่อวาน', daysAgo: 1, unread: false, actionable: false },
  { id: 'a7', category: 'expiring', title: 'สิทธิ์ผู้อนุมัติชั่วคราวใกล้หมดอายุ', description: 'สุพัตรา ใจเย็น · เหลือ 5 วัน', time: 'เมื่อวาน', daysAgo: 1, unread: true, actionable: false },
  { id: 'a8', category: 'welfare', title: 'แก้ไขวงเงินสวัสดิการ', description: 'ค่าออกกำลังกาย / ฟิตเนส ปรับเป็น ฿12,000 ต่อปี', time: '3 วันที่แล้ว', daysAgo: 3, unread: true, actionable: false },
  { id: 'a9', category: 'system', title: 'นำเข้าประวัติเบิกย้อนหลังสำเร็จ', description: '7 รายการจากไฟล์ import_sep.csv', time: '5 วันที่แล้ว', daysAgo: 5, unread: true, actionable: false },
  { id: 'a10', category: 'security', title: 'เข้าสู่ระบบจากอุปกรณ์ใหม่', description: 'บัญชี admin.it · กรุงเทพฯ', time: '12 วันที่แล้ว', daysAgo: 12, unread: true, actionable: false },
];

// ─── สวัสดิการ (Mock) ──────────────────────────────────────────────────────
const welfareDefaults: Omit<WelfareItem, 'code' | 'name' | 'updatedAt' | 'amount' | 'status' | 'estimatedBudget'> = {
  owner: 'Admin',
  budgetType: 'รายปี',
  maxClaims: 'ไม่เกิน 12 ครั้ง/ปี',
  eligible: 'พนักงานประจำ',
  startDate: '1 ม.ค. 2570',
  approver: 'HR (Reviewer)',
  documents: [],
  step: 3,
};

export const welfareItems: WelfareItem[] = [
  {
    ...welfareDefaults,
    code: 'WEL-001',
    name: 'ค่าเครื่องมือ AI สำหรับพนักงาน',
    updatedAt: '2026-10-10',
    amount: 6000,
    status: 'active',
    estimatedBudget: '฿720,000/ปี · 120 คน',
    documents: ['บันทึกขออนุมัติ.pdf', 'เปรียบเทียบอัตราตลาด.xlsx'],
    step: 1,
  },
  { ...welfareDefaults, code: 'WEL-002', name: 'ค่าออกกำลังกาย / ฟิตเนส', updatedAt: '2026-10-09', amount: 12000, status: 'active', estimatedBudget: '฿1,440,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-003', name: 'ค่าตัดแว่นสายตา', updatedAt: '2026-10-07', amount: 3000, status: 'active', maxClaims: '1 ครั้ง/ปี', estimatedBudget: '฿360,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-004', name: 'วัคซีนไข้หวัดใหญ่', updatedAt: '2026-10-03', amount: 1500, status: 'active', maxClaims: '1 ครั้ง/ปี', estimatedBudget: '฿180,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-005', name: 'ทุนอบรมหลักสูตรภายนอก', updatedAt: '2026-09-30', amount: 20000, status: 'active', maxClaims: '2 ครั้ง/ปี', estimatedBudget: '฿2,400,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-006', name: 'ค่าเดินทางมาทำงาน', updatedAt: '2026-09-26', amount: 9600, status: 'active', budgetType: 'รายเดือน', estimatedBudget: '฿1,152,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-007', name: 'ค่าฝากครรภ์ / คลอดบุตร', updatedAt: '2026-09-20', amount: 25000, status: 'active', maxClaims: 'ต่อการคลอด 1 ครั้ง', estimatedBudget: '฿250,000/ปี · ประมาณ 10 คน' },
  { ...welfareDefaults, code: 'WEL-008', name: 'ค่าอาหารกลางวัน', updatedAt: '2026-09-15', amount: 2500, status: 'inactive', budgetType: 'รายเดือน', estimatedBudget: '—' },
  { ...welfareDefaults, code: 'WEL-009', name: 'ค่าเครื่องมือ AI', updatedAt: '2026-09-10', amount: 6000, status: 'active', estimatedBudget: '฿720,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-010', name: 'ค่าเดินทางไปอบรม', updatedAt: '2026-09-08', amount: 5000, status: 'active', budgetType: 'ต่อครั้ง', estimatedBudget: '฿600,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-011', name: 'ค่าตรวจสุขภาพ', updatedAt: '2026-09-05', amount: 4000, status: 'active', maxClaims: '1 ครั้ง/ปี', estimatedBudget: '฿480,000/ปี · 120 คน' },
  { ...welfareDefaults, code: 'WEL-012', name: 'ค่าใช้จ่ายอื่น ๆ', updatedAt: '2026-09-01', amount: 8000, status: 'inactive', estimatedBudget: '—' },
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
export const auditEntries: AuditEntry[] = [
  {
    id: 'g1', at: '2026-10-10T19:00', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'เปลี่ยนบทบาทของ สมชาย ดีใจมาก', detail: 'Employee → HR Recruiter',
    category: 'settings', action: 'role-change',
    change: { before: 'บทบาท: Employee', after: 'บทบาท: HR', reason: 'ย้ายทีม' },
  },
  {
    id: 'g2', at: '2026-10-10T18:40', actor: 'AdminE0002', actorRole: 'Admin',
    title: 'เพิ่มสวัสดิการ AI รายเดือนให้ IT', detail: 'แผนก : IT',
    category: 'settings', action: 'welfare',
    change: { before: 'ไม่มีสวัสดิการ', after: 'ค่าเครื่องมือ AI · ฿500/เดือน', reason: 'นโยบายสนับสนุนการใช้ AI' },
  },
  {
    id: 'g3', at: '2026-10-10T17:15', actor: 'ระบบ', actorRole: 'ระบบ',
    title: 'ล็อกบัญชีอัตโนมัติ', detail: 'E1234 : ล็อกอินผิด 5 ครั้ง',
    category: 'issue', action: 'security',
    change: { before: 'สถานะ: ใช้งาน', after: 'สถานะ: ถูกล็อก 30 นาที' },
  },
  {
    id: 'g4', at: '2026-10-10T09:05', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'แจ้ง Error', detail: 'ระบบ : ระบบล่ม',
    category: 'issue', action: 'system',
  },
  {
    id: 'g5', at: '2026-10-09T15:30', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ไฟล์ import_sep.csv · 7 รายการ',
    category: 'import', action: 'import',
  },
  {
    id: 'g6', at: '2026-10-09T11:20', actor: 'AdminE0002', actorRole: 'Admin',
    title: 'ปรับวงเงินค่าออกกำลังกาย / ฟิตเนส', detail: 'WEL-002',
    category: 'settings', action: 'welfare',
    change: { before: 'วงเงิน: ฿10,000/ปี', after: 'วงเงิน: ฿12,000/ปี', reason: 'ปรับตามอัตราตลาด' },
  },
  {
    id: 'g7', at: '2026-10-08T16:45', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'แก้ไขอีเมลของ นันทพร เจริญสุข', detail: 'E00004',
    category: 'settings', action: 'user-update',
    change: { before: 'อีเมล: nanthaporn@qmail.com', after: 'อีเมล: nannaporn@qmail.com', reason: 'สะกดผิด' },
  },
  {
    id: 'g8', at: '2026-10-07T10:10', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'เปลี่ยนสถานะ พงศกร วงศ์สวัสดิ์', detail: 'E00005',
    category: 'settings', action: 'user-update',
    change: { before: 'สถานะ: ใช้งาน', after: 'สถานะ: ลาออก', reason: 'ลาออกมีผล 30 ก.ย. 69' },
  },
  {
    id: 'g9', at: '2026-09-28T14:00', actor: 'AdminE0002', actorRole: 'Admin',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ไฟล์ import_aug.xlsx · 12 รายการ',
    category: 'import', action: 'import',
  },
  {
    id: 'g10', at: '2026-09-15T09:30', actor: 'AdminE0001', actorRole: 'Admin',
    title: 'ปิดใช้สวัสดิการค่าอาหารกลางวัน', detail: 'WEL-008',
    category: 'settings', action: 'welfare',
    change: { before: 'สถานะ: ใช้งาน', after: 'สถานะ: หยุดใช้', reason: 'รวมเข้ากับค่าครองชีพ' },
  },
  {
    id: 'g11', at: '2026-09-02T13:25', actor: 'ระบบ', actorRole: 'ระบบ',
    title: 'แจ้งปัญหาหน้าเว็บโหลดช้า', detail: 'หน้า ส่งคำขอสวัสดิการ',
    category: 'issue', action: 'system',
  },
  {
    id: 'g12', at: '2025-12-20T10:00', actor: 'AdminE0002', actorRole: 'Admin',
    title: 'นำเข้ารายชื่อพนักงานใหม่', detail: 'ไฟล์ new_hires.csv · 3 คน',
    category: 'import', action: 'import',
  },
];
