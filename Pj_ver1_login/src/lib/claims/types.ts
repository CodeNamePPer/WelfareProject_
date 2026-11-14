// ชนิดข้อมูลคำขอเบิกที่ใช้ได้ทั้ง server และ client

export type ClaimDbStatus =
  | "draft"
  | "pending_hr"
  | "needs_revision"
  | "pending_finance"
  | "finance_returned"
  | "awaiting_payment"
  | "paid"
  | "rejected"
  | "cancelled";

export type ClaimEventKind =
  | "submitted"
  | "resubmitted"
  | "revision_requested"
  | "hr_approved"
  | "finance_approved"
  | "amount_adjusted"
  | "returned"
  | "rejected"
  | "cancelled"
  | "pay_date_changed"
  | "paid"
  | "payment_failed"
  | "payment_reversed"
  | "receipt_submitted"
  | "receipt_approved"
  | "receipt_returned"
  | "advance_cancelled"
  | "refund_received";

export type BudgetKind = "yearly" | "monthly" | "per_claim";

export type ClaimAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  docKind?: string | null;
  isRestricted?: boolean;
};

export type ClaimEventRecord = {
  kind: ClaimEventKind;
  at: string;
  actorCode: string | null;
  actorName: string | null;
  actorRole: string | null;
  note: string | null;
};

export type ClaimAdvanceRecord = {
  status: string;
  advanceAmount: number;
  receiptDueDate: string;
  receiptAmount: number | null;
  settlement: string | null;
  extraAmountApproved: number | null;
  refundAmount: number | null;
};

export type ClaimRecord = {
  id: string;
  claimNo: string;
  status: ClaimDbStatus;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  submittedByCode: string;
  submittedByName: string;
  proxyReason?: string | null;
  beneficiaryRelation?: string | null;
  beneficiaryName?: string | null;
  totalCost?: number | null;
  insurancePaid?: number | null;
  insurerName?: string | null;
  advance?: ClaimAdvanceRecord | null;
  benefitCode: string;
  benefitName: string;
  budgetType: BudgetKind;
  formType: string | null;
  amountRequested: number;
  amountApproved: number | null;
  /** วันที่เกิดค่าใช้จ่าย YYYY-MM-DD (ว่างได้เฉพาะฉบับร่าง) */
  expenseDate: string | null;
  /** เวลาที่ยื่น ISO (ว่างเมื่อเป็นร่าง) */
  submittedAt: string | null;
  createdAt: string;
  providerName: string | null;
  note: string | null;
  details: Record<string, string>;
  /** วงเงินที่ใช้อ้างอิงตอนยื่น */
  limit: number;
  /** ยอดที่ใช้หรือรอตรวจในรอบวงเงินเดียวกัน ไม่รวมคำขอนี้ */
  used: number;
  payRoundDate: string | null;
  payDateOverride: string | null;
  approvalNo: string | null;
  accountingRef: string | null;
  receipts: { receiptNo: string | null; receiptDate: string | null; issuerName: string | null; amount: number | null }[];
  attachments: ClaimAttachment[];
  events: ClaimEventRecord[];
  payment: { transferRef: string | null; paidAt: string | null; bankCode: string; accountMasked: string; preparedByName: string | null } | null;
};

/** สิทธิ์สวัสดิการของพนักงาน พร้อมยอดในรอบวงเงินปัจจุบัน */
export type EmployeeBenefit = {
  code: string;
  name: string;
  description: string | null;
  category: string;
  formType: string;
  budgetType: BudgetKind;
  budgetLabel: string;
  /** เงื่อนไขจำนวนครั้ง เช่น "1 ครั้ง/ปี" */
  maxClaimsNote: string | null;
  /** จำนวนครั้งที่เบิกได้ต่อปี (null = ไม่จำกัด) */
  maxClaims: number | null;
  /** จำนวนคำขอของปีนี้ที่นับแล้ว รวมที่รอตรวจ */
  claimsThisYear: number;
  eligibilityNote: string | null;
  /** เอกสารที่แอดมินกำหนดให้แนบเพิ่มจากใบเสร็จ */
  documents: string[];
  limit: number;
  used: number;
  pending: number;
  remaining: number;
};

export type ClaimAction =
  | "hr_approve"
  | "hr_return"
  | "hr_reject"
  | "finance_approve"
  | "finance_return"
  | "finance_reject"
  | "pay"
  | "cancel";

// ─── คิวของ HR ───────────────────────────────────────────────────────────────

export type FieldChange = { field: string; before: string; after: string };
export type Attachment = { name: string; size: string; src: string; isImage: boolean };

export type PendingRequest = {
  id: string;
  itemType: "benefit" | "edit";
  employeeCode: string;
  /** ชื่อสำรองเมื่อหาพนักงานรหัสนี้ในฐานข้อมูลไม่เจอ */
  fallbackName: string;
  benefit: string;
  used: number;
  limit: number;
  amount: number;
  /** วันที่ยื่น "YYYY-MM-DD" */
  submitted: string;
  changes?: FieldChange[];
  attachments?: Attachment[];
  /** รายละเอียดเฉพาะสวัสดิการ เช่น ชื่อผู้ป่วย อาการ */
  details?: Record<string, string>;
  expenseDate?: string | null;
  providerName?: string | null;
  note?: string | null;
  receiptNo?: string | null;
  /** เหตุผลล่าสุดที่การเงินส่งกลับ */
  financeReturnNote?: string | null;
};

/** คำเรียกสถานะของคำขอ ใช้ชุดเดียวกันทุกฝ่าย เพื่อให้คำขอเดียวกันแสดงคำเดียวกัน */
export const CLAIM_STATUS_LABEL: Record<ClaimDbStatus, string> = {
  draft: "ฉบับร่าง",
  pending_hr: "รอ HR ตรวจสอบ",
  needs_revision: "รอแก้ไข",
  pending_finance: "รอการเงินตรวจสอบ",
  finance_returned: "การเงินส่งกลับ",
  awaiting_payment: "อนุมัติแล้ว รอจ่าย",
  paid: "จ่ายแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิกแล้ว",
};

export type RequestStatus = "pending" | "approved" | "rejected" | "revision";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
  revision: "รอพนักงานแก้ไข",
};

/** คำขอที่ดำเนินการแล้ว: ใคร ทำอะไร เมื่อไร เพราะอะไร */
export type DecisionRecord = { actorCode: string; date: string; note?: string };
export type RequestDetail = { status: RequestStatus; statusText: string; request: PendingRequest; decision: DecisionRecord | null };

export type HrStatusCounts = { pending: number; revision: number; rejected: number; approved: number };
