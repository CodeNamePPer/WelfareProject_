// Mock data only. Replace with API calls when the database is connected.
import type {
  Claim,
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
  { id: 'e3', code: 'E0003', name: 'สมชาย ใจดี' },
  { id: 'e7', code: 'E0007', name: 'วิภา สุขสันต์' },
  { id: 'e12', code: 'E0012', name: 'ธนากร แสงทอง' },
  { id: 'e21', code: 'E0021', name: 'พิมพ์ชนก รัตนวงศ์' },
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
    employeeId: 'E0001',
    email: 'somchai.j@company.co.th',
    name: 'สมชาย ใจดี',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T08:12:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    employeeId: 'E0003',
    email: 'vipa.s@company.co.th',
    name: 'วิภา สุขสันต์',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T14:05:00Z',
    updatedAt: '2026-09-15T11:30:00Z',
  },
  {
    employeeId: 'E0007',
    email: 'thanakorn.s@company.co.th',
    name: 'ธนากร แสงทอง',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-29T09:45:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  },
  {
    employeeId: 'E0012',
    email: 'pimchanok.r@company.co.th',
    name: 'พิมพ์ชนก รัตนวงศ์',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T07:30:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
  {
    employeeId: 'E0021',
    email: 'anon.k@company.co.th',
    name: 'อานนท์ กาญจนา',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-28T13:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    employeeId: 'E0034',
    email: 'nipa.w@company.co.th',
    name: 'นิภา วิชิต',
    role: 'EMPLOYEE',
    status: 'RESIGNED',
    lastLoginAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-10T15:00:00Z',
  },
  {
    employeeId: 'E0042',
    email: 'finance2@company.co.th',
    name: 'ประเสริฐ มั่งมี',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T10:20:00Z',
    updatedAt: '2026-10-05T09:30:00Z',
  },
  {
    employeeId: 'E0055',
    email: 'hr3@company.co.th',
    name: 'จิตรา สวยงาม',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T09:00:00Z',
    updatedAt: '2026-10-15T14:00:00Z',
  },
];
