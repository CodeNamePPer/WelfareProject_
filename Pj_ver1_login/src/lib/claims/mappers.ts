// แปลงคำขอจากฐานข้อมูลเป็นรูปแบบที่หน้าจอแต่ละฝ่ายใช้อยู่
import type { Claim, ClaimEvent } from "../../types";
import type { PaymentRequest, PaymentStatus, RoundNo, WelfareType } from "../../features/payroll/lib/types";
import { CLAIM_STATUS_LABEL } from "./types";
import type { ClaimDbStatus, ClaimEventKind, ClaimRecord, HrStatusCounts, PendingRequest, RequestDetail, RequestStatus } from "./types";

const TZ = "Asia/Bangkok";
export const toBangkokDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

function lastEvent(claim: ClaimRecord, kinds: ClaimEventKind[]) {
  return [...claim.events].reverse().find((event) => kinds.includes(event.kind)) ?? null;
}

const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

// ─── HR ─────────────────────────────────────────────────────────────────────

export const HR_QUEUE_STATUSES: ClaimDbStatus[] = ["pending_hr", "finance_returned"];
export const HR_APPROVED_STATUSES: ClaimDbStatus[] = ["pending_finance", "awaiting_payment", "paid"];

export function toPendingRequest(claim: ClaimRecord): PendingRequest {
  return {
    id: claim.claimNo,
    itemType: "benefit",
    employeeCode: claim.employeeCode,
    fallbackName: claim.employeeName,
    benefit: claim.benefitName,
    used: claim.used,
    limit: claim.limit,
    amount: claim.amountRequested,
    submitted: toBangkokDate(claim.submittedAt ?? claim.createdAt),
    attachments: claim.attachments.map((file) => ({
      name: file.fileName,
      size: fileSize(file.sizeBytes),
      src: `/api/claims/attachments/${file.id}`,
      isImage: file.mimeType.startsWith("image/"),
    })),
    details: claim.details,
    expenseDate: claim.expenseDate,
    providerName: claim.providerName,
    note: claim.note,
    receiptNo: claim.receipts[0]?.receiptNo ?? null,
    financeReturnNote: claim.status === "finance_returned" ? (lastEvent(claim, ["returned"])?.note ?? null) : null,
  };
}

export function hrStatusOf(status: ClaimDbStatus): RequestStatus | null {
  if (HR_QUEUE_STATUSES.includes(status)) return "pending";
  if (HR_APPROVED_STATUSES.includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  if (status === "needs_revision") return "revision";
  return null;
}

const DECISION_KIND: Record<Exclude<RequestStatus, "pending">, ClaimEventKind[]> = {
  approved: ["hr_approved"],
  rejected: ["rejected"],
  revision: ["revision_requested"],
};

export function toRequestDetail(claim: ClaimRecord): RequestDetail | null {
  const status = hrStatusOf(claim.status);
  if (!status) return null;
  const event = status === "pending" ? null : lastEvent(claim, DECISION_KIND[status]);
  return {
    status,
    statusText: CLAIM_STATUS_LABEL[claim.status],
    request: toPendingRequest(claim),
    decision: event ? { actorCode: event.actorCode ?? "", date: toBangkokDate(event.at), note: event.note ?? undefined } : null,
  };
}

export function toHrCounts(claims: ClaimRecord[]): HrStatusCounts {
  const count = (status: RequestStatus) => claims.filter((claim) => hrStatusOf(claim.status) === status).length;
  return { pending: count("pending"), revision: count("revision"), rejected: count("rejected"), approved: count("approved") };
}

// ─── การเงิน ─────────────────────────────────────────────────────────────────

export const FINANCE_STATUSES: ClaimDbStatus[] = ["pending_finance", "finance_returned", "awaiting_payment", "paid", "rejected"];

const PAYMENT_STATUS: Partial<Record<ClaimDbStatus, PaymentStatus>> = {
  pending_finance: "approved",
  finance_returned: "returned",
  awaiting_payment: "pending",
  paid: "paid",
  rejected: "rejected",
};

const WELFARE_BY_FORM: Record<string, WelfareType> = {
  medical: "medical",
  checkup: "medical",
  child_medical: "medical",
  child_vaccine: "medical",
  dental: "dental",
  training: "self_dev",
};

export function toPaymentRequest(claim: ClaimRecord): PaymentRequest {
  const requestDate = toBangkokDate(claim.submittedAt ?? claim.createdAt);
  const round: RoundNo = Number(requestDate.slice(8, 10)) <= 15 ? 1 : 2;
  const approved = lastEvent(claim, ["finance_approved", "hr_approved"]);
  const paidAt = claim.status === "paid" ? claim.payment?.paidAt : null;
  const receipt = claim.receipts[0];
  return {
    id: claim.claimNo,
    employeeId: claim.employeeCode,
    employeeName: claim.employeeName,
    department: claim.department ?? "-",
    welfare: WELFARE_BY_FORM[claim.formType ?? ""] ?? "other",
    amount: claim.amountRequested,
    paidAmount: claim.amountApproved ?? claim.amountRequested,
    requestDate,
    payDate: paidAt ? toBangkokDate(paidAt) : (claim.payDateOverride ?? claim.payRoundDate ?? ""),
    round,
    status: PAYMENT_STATUS[claim.status] ?? "review",
    returnReason: claim.status === "finance_returned" ? (lastEvent(claim, ["returned"])?.note ?? undefined) : undefined,
    receiptNo: receipt?.receiptNo ?? "-",
    approvalNo: claim.approvalNo ?? "-",
    hospital: claim.providerName ?? "-",
    treatmentDate: claim.expenseDate ?? "",
    receiptDate: receipt?.receiptDate ?? "",
    submitter: claim.submittedByName,
    receiptIssuer: receipt?.issuerName ?? "-",
    accountingRef: claim.accountingRef ?? "-",
    approvedDate: approved ? toBangkokDate(approved.at) : "",
    approver: approved?.actorName ?? "-",
    payer: claim.payment?.preparedByName ?? "-",
    bankAccount: claim.payment?.accountMasked ?? "-",
  };
}

// ─── Admin ───────────────────────────────────────────────────────────────────

const ADMIN_EVENT: Record<ClaimEventKind, ClaimEvent["kind"]> = {
  submitted: "submitted",
  resubmitted: "resubmitted",
  revision_requested: "revision-requested",
  amount_adjusted: "amount-adjusted",
  hr_approved: "hr-approved",
  finance_approved: "finance-approved",
  rejected: "rejected",
  returned: "returned",
  cancelled: "cancelled",
  paid: "paid",
  pay_date_changed: "pay-date-changed",
  payment_failed: "payment-failed",
  payment_reversed: "payment-reversed",
  receipt_submitted: "receipt-submitted",
  receipt_approved: "receipt-approved",
  receipt_returned: "receipt-returned",
  advance_cancelled: "advance-cancelled",
  refund_received: "refund-received",
};

const ADVANCE_STATUS_LABEL: Record<string, string> = {
  pending: "รอพิจารณาเบิกล่วงหน้า",
  disbursed: "โอนเงินล่วงหน้าแล้ว · รอแนบใบเสร็จจริง",
  receipt_submitted: "แนบใบเสร็จแล้ว · รอ HR ตรวจ",
  settled: "เคลียร์ยอดใบเสร็จเรียบร้อย",
  overdue: "เกินกำหนดส่งใบเสร็จ",
  cancelled: "ยกเลิกเบิกล่วงหน้า",
};

const ROLE_SUFFIX: Record<string, string> = { HR: "HR", FINANCE: "การเงิน", SUPER_ADMIN: "Admin" };

export function toAdminClaim(claim: ClaimRecord): Claim {
  const status: Claim["status"] =
    claim.status === "rejected" || claim.status === "cancelled"
      ? "rejected"
      : claim.status === "awaiting_payment" || claim.status === "paid"
        ? "approved"
        : "pending";
  const timeline = claim.events.flatMap((event): ClaimEvent[] => {
    const kind = ADMIN_EVENT[event.kind];
    if (!kind) return [];
    const role = event.actorRole ? ROLE_SUFFIX[event.actorRole] : undefined;
    return [
      {
        kind,
        at: toBangkokDate(event.at),
        by: kind === "submitted" && claim.submittedByCode === claim.employeeCode ? undefined : event.actorName ? `${event.actorName}${role ? ` (${role})` : ""}` : undefined,
        note: event.note ?? undefined,
      },
    ];
  });
  const approvedAmount =
    claim.status === "rejected" || claim.status === "cancelled"
      ? null
      : claim.amountApproved !== null
        ? claim.amountApproved
        : status === "approved"
          ? claim.amountRequested
          : null;
  return {
    id: claim.id,
    code: claim.claimNo,
    employeeId: claim.employeeCode,
    benefit: claim.benefitName,
    amount: claim.amountRequested,
    approvedAmount,
    status,
    statusText: CLAIM_STATUS_LABEL[claim.status],
    date: toBangkokDate(claim.submittedAt ?? claim.createdAt),
    expenseDate: claim.expenseDate ?? "",
    annualLimit: claim.limit || null,
    note: claim.note ?? undefined,
    submittedByName: claim.submittedByCode !== claim.employeeCode ? claim.submittedByName : null,
    proxyReason: claim.proxyReason ?? null,
    beneficiaryRelation: claim.beneficiaryRelation ?? null,
    beneficiaryName: claim.beneficiaryName ?? null,
    totalCost: claim.totalCost ?? null,
    insurancePaid: claim.insurancePaid ?? null,
    insurerName: claim.insurerName ?? null,
    advance: claim.advance
      ? {
          ...claim.advance,
          statusLabel: ADVANCE_STATUS_LABEL[claim.advance.status] ?? claim.advance.status,
        }
      : null,
    attachments: claim.attachments.map((file) => file.fileName),
    attachmentItems: claim.attachments.map((file) => ({
      id: file.id,
      name: file.fileName,
      docKind: file.docKind ?? undefined,
      isRestricted: Boolean(file.isRestricted),
      src: `/api/claims/attachments/${file.id}`,
    })),
    timeline,
  };
}

/** สถานะที่แสดงในหน้าผู้ดูแลระบบ */
export const ADMIN_STATUSES: ClaimDbStatus[] = [
  "pending_hr",
  "needs_revision",
  "pending_finance",
  "finance_returned",
  "awaiting_payment",
  "paid",
  "rejected",
  "cancelled",
];
