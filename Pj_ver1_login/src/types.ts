export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Employee {
  id: string;
  code: string;
  name: string;
  department?: string;
}

/** submitted → hr-approved → finance-approved → paid; rejected can happen at the HR or finance step. */
export type ClaimEventKind =
  | 'submitted'
  | 'resubmitted'
  | 'revision-requested'
  | 'amount-adjusted'
  | 'hr-approved'
  | 'finance-approved'
  | 'rejected'
  | 'returned'
  | 'cancelled'
  | 'paid'
  | 'pay-date-changed'
  | 'payment-failed'
  | 'payment-reversed'
  | 'receipt-submitted'
  | 'receipt-approved'
  | 'receipt-returned'
  | 'advance-cancelled'
  | 'refund-received';

export interface ClaimEvent {
  kind: ClaimEventKind;
  /** ISO date, YYYY-MM-DD */
  at: string;
  /** ผู้ดำเนินการ เช่น "วิภา สุขสันต์ (HR)" – ว่างเมื่อเป็นการยื่นของพนักงานเอง */
  by?: string;
  /** เหตุผลปฏิเสธ / หมายเหตุการปรับยอด / รอบจ่าย */
  note?: string;
}

export interface ClaimAttachmentItem {
  id: string;
  name: string;
  docKind?: string;
  isRestricted?: boolean;
  src?: string;
}

export interface ClaimAdvanceSummary {
  status: string;
  statusLabel: string;
  advanceAmount: number;
  receiptDueDate: string;
  receiptAmount: number | null;
  settlement: string | null;
  extraAmountApproved: number | null;
  refundAmount: number | null;
}

export interface Claim {
  id: string;
  /** เลขที่คำขอ เช่น CLM-2569-0012 */
  code: string;
  employeeId: string;
  benefit: string;
  /** ยอดขอเบิก */
  amount: number;
  /** ยอดที่อนุมัติจริง – null เมื่อยังไม่อนุมัติหรือถูกปฏิเสธ */
  approvedAmount: number | null;
  status: ClaimStatus;
  /** คำเรียกสถานะจริงของคำขอ ชุดเดียวกับทุกฝ่าย */
  statusText: string;
  /** วันที่ยื่น – ISO date, YYYY-MM-DD */
  date: string;
  /** วันที่เกิดค่าใช้จ่าย (ตามใบเสร็จ) – ISO date */
  expenseDate: string;
  /** วงเงินสิทธิ์ต่อปีของสวัสดิการนี้ – null = ไม่จำกัด */
  annualLimit: number | null;
  /** หมายเหตุจากผู้เบิก */
  note?: string;
  /** ข้อมูลการยื่นแทน (HR ยื่นแทนพนักงาน) */
  submittedByName?: string | null;
  proxyReason?: string | null;
  /** ผู้รับผลประโยชน์ & ประกัน */
  beneficiaryRelation?: string | null;
  beneficiaryName?: string | null;
  totalCost?: number | null;
  insurancePaid?: number | null;
  insurerName?: string | null;
  /** ข้อมูลเบิกล่วงหน้า (ถ้ามี) */
  advance?: ClaimAdvanceSummary | null;
  /** ชื่อไฟล์เอกสารแนบ */
  attachments: string[];
  /** รายละเอียดเอกสารแนบสำหรับเปิดดู */
  attachmentItems?: ClaimAttachmentItem[];
  /** เรียงจากเก่าไปใหม่ – รายการแรกคือการยื่นเสมอ */
  timeline: ClaimEvent[];
}

export interface Period {
  id: string;
  label: string;
  from: string;
  to: string;
  /** ใช้แบ่งกลุ่มในตัวเลือก "รายเดือน" / "รายปี" */
  kind?: 'month' | 'year';
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
    /** ลาออก + เสียชีวิต */
    inactive: number;
    resigned: number;
    deceased: number;
    /** null = โหลดวันเริ่มงานไม่สำเร็จ */
    newThisMonth: number | null;
  } | null;
  hrQueue: {
    /** คำขอที่ยังอยู่ขั้น HR ตรวจ (ยังไม่มี hr-approved) */
    pending: number;
    /** HR อนุมัติแล้ว รอการเงิน – ไม่นับเป็นงานของ HR */
    atFinance: number;
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

export interface WelfareLevelLimit {
  levelId: string;
  code: string;
  name: string;
  amount: number;
}

export interface WelfareItem {
  id?: string;
  code: string;
  name: string;
  category?: string | null;
  description?: string | null;
  detail?: string | null;
  imagePath?: string | null;
  allowFamily?: boolean;
  allowInsurance?: boolean;
  allowAdvance?: boolean;
  levelLimits?: WelfareLevelLimit[];
  /** ISO date, YYYY-MM-DD */
  updatedAt: string;
  owner: string;
  amount: number;
  status: WelfareStatus;
  budgetType: BudgetType;
  /** ข้อความแสดงผล เช่น "1 ครั้ง/ปี" ('' = ไม่จำกัด) */
  maxClaims: string;
  /** จำนวนครั้งที่เบิกได้ต่อปี ระบบบังคับตอนยื่นคำขอ (null = ไม่จำกัด) */
  maxClaimsPerYear: number | null;
  /** ชุดแบบฟอร์มยื่นคำขอ คีย์ของ FORM_FIELDS ใน lib/claims/forms.ts */
  formType: string;
  eligible: string;
  /** วันที่เริ่มใช้วงเงินปัจจุบัน – ISO date, YYYY-MM-DD ('' = ยังไม่กำหนด) */
  startDate: string;
  /** รหัสบทบาทผู้อนุมัติ เช่น HR */
  approver: string;
  estimatedBudget: string;
  documents: string[];
  /** วงเงินใหม่ที่ตั้งไว้ล่วงหน้า */
  nextLimit?: { amount: number; from: string } | null;
  /** รายการใหม่ที่ยังไม่ได้บันทึกลงฐานข้อมูล */
  unsaved?: boolean;
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
/** ไม่ระบุ = สำเร็จ */
export type AuditResult = 'success' | 'failed' | 'partial';

/** ค่าก่อน/หลังของฟิลด์เดียว เช่น { label: 'วงเงิน', before: '฿10,000/ปี', after: '฿12,000/ปี' } */
export interface AuditChangeField {
  label: string;
  before: string;
  after: string;
}

/** สิ่งที่ถูกกระทำ เช่น พนักงาน E00004 หรือสวัสดิการ WEL-002 */
export interface AuditTarget {
  code: string;
  name?: string;
  /** ลิงก์ไปหน้าของเป้าหมาย (ถ้ามี) */
  href?: string;
}

export interface AuditImportSummary {
  file: string;
  total: number;
  success: number;
  failed: number;
}

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
  target?: AuditTarget;
  result?: AuditResult;
  ip?: string;
  change?: { fields: AuditChangeField[]; reason?: string };
  importSummary?: AuditImportSummary;
}
