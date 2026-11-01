export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Employee {
  id: string;
  code: string;
  name: string;
}

export interface Claim {
  id: string;
  employeeId: string;
  benefit: string;
  amount: number;
  status: ClaimStatus;
  /** ISO date, YYYY-MM-DD */
  date: string;
}

export interface Period {
  id: string;
  label: string;
  from: string;
  to: string;
}

export type NotificationKind = 'access-request' | 'expiring' | 'system';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  actionLabel?: string;
}

export interface RoleCount {
  id: string;
  role: string;
  count: number;
}

/** null = โหลดไม่สำเร็จ – แสดง "—" แทน 0 เพื่อไม่ให้ดูเหมือนข้อมูลจริง */
/** สถิติการ์ดสรุปบนหน้าแรก Admin – แต่ละส่วนเป็น null เมื่อโหลดไม่สำเร็จ */
export interface SummaryStats {
  users: {
    active: number;
    /** ลาออก/เสียชีวิต */
    inactive: number;
    /** null = โหลดวันเริ่มงานไม่สำเร็จ */
    newThisMonth: number | null;
  } | null;
  hrQueue: {
    pending: number;
    approved: number;
    rejected: number;
    /** อายุคำขอที่รอนานที่สุด (วัน) – null เมื่อไม่มีคำขอรอ */
    oldestPendingDays: number | null;
  } | null;
  logins: {
    /** จำนวนคน (ไม่ซ้ำ) ที่ล็อกอินสำเร็จวันนี้ */
    today: number;
    /** 7 วันล่าสุด เก่าสุดก่อน – วันสุดท้ายคือวันนี้ */
    daily: number[];
  } | null;
  loginErrors: {
    failed: number;
    blocked: number;
    /** 7 วันล่าสุด เก่าสุดก่อน */
    daily: number[];
    /** ISO เวลาที่เกิดล่าสุด */
    lastAt: string | null;
  } | null;
}

// ─── ตั้งค่าผู้ใช้งานระบบ ───────────────────────────────────────────────────

export type UserRole = 'EMPLOYEE' | 'HR' | 'FINANCE' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'RESIGNED';

export interface SystemUser {
  employeeId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  updatedAt?: string;
}

// ─── การแจ้งเตือน (หน้าเต็ม) ───────────────────────────────────────────────

export type AlertCategory = 'access' | 'security' | 'system' | 'welfare' | 'expiring';

export interface AdminAlert {
  id: string;
  category: AlertCategory;
  title: string;
  description: string;
  time: string;
  /** 0 = วันนี้, 1 = เมื่อวาน, ... ใช้จัดกลุ่มและกรองช่วงวันที่ */
  daysAgo: number;
  unread: boolean;
  /** true = ยังต้องมีคนดำเนินการ (นับใน "รอดำเนินการ") */
  actionable: boolean;
}

// ─── จัดการสวัสดิการ ────────────────────────────────────────────────────────

export type WelfareStatus = 'active' | 'inactive';
export type BudgetType = 'รายปี' | 'รายเดือน' | 'ต่อครั้ง';

export interface WelfareItem {
  code: string;
  name: string;
  /** ISO date, YYYY-MM-DD */
  updatedAt: string;
  owner: string;
  amount: number;
  status: WelfareStatus;
  budgetType: BudgetType;
  maxClaims: string;
  eligible: string;
  startDate: string;
  approver: string;
  estimatedBudget: string;
  documents: string[];
  /** 0–3: เพิ่มข้อมูล → ตรวจข้อมูล → บันทึก → แจ้งอีเมล */
  step: number;
}

export type ImportStatus = 'approved' | 'needs-fix' | 'rejected';

export interface ImportRecord {
  id: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  benefit: string;
  claimant: string;
  amount: number;
  status: ImportStatus;
}

// ─── ประวัติการแก้ไข Log ────────────────────────────────────────────────────

export type AuditCategory = 'settings' | 'import' | 'issue';
export type AuditAction = 'role-change' | 'welfare' | 'user-update' | 'security' | 'system' | 'import';

export interface AuditEntry {
  id: string;
  /** ISO date-time (local) */
  at: string;
  actor: string;
  actorRole: string;
  title: string;
  detail: string;
  category: AuditCategory;
  action: AuditAction;
  change?: { before: string; after: string; reason?: string };
}
