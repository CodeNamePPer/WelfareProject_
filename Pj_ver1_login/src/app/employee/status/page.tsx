import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { listClaims } from "@/lib/claims/service";
import { toBangkokDate } from "@/lib/claims/mappers";
import { CLAIM_STATUS_LABEL, type ClaimRecord } from "@/lib/claims/types";
import { APPROVED, RESERVED, baht, countedAmount, lastEventOf, payDateOf } from "@/lib/claims/requester";
import StatusClient, { type ApprovalStep, type RequestStatus, type WelfareRequest } from "./StatusClient";

const STATUS_MAP: Record<ClaimRecord["status"], RequestStatus> = {
  draft: "draft",
  pending_hr: "pending",
  needs_revision: "revision",
  pending_finance: "processing",
  finance_returned: "processing",
  awaiting_payment: "approved",
  paid: "approved",
  rejected: "rejected",
  cancelled: "cancelled",
};

const LAST_STEP: Record<ClaimRecord["status"], string> = {
  draft: "ยังไม่ได้ส่งคำขอ",
  pending_hr: "รออนุมัติจากฝ่ายบุคคล",
  needs_revision: "รอคุณแก้ไขข้อมูล",
  pending_finance: "รอฝ่ายการเงินตรวจสอบ",
  finance_returned: "ฝ่ายการเงินส่งกลับให้ฝ่ายบุคคล",
  awaiting_payment: "รอจ่ายเงินตามรอบ",
  paid: "จ่ายเงินแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิกแล้ว",
};

const thaiDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const thaiDateTime = (iso: string) => `${thaiDate(iso)} · ${new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })} น.`;

function stepsOf(claim: ClaimRecord): ApprovalStep[] {
  const find = (kind: ClaimRecord["events"][number]["kind"]) => [...claim.events].reverse().find((event) => event.kind === kind);
  const submitted = find("resubmitted") ?? find("submitted");
  const hr = find("hr_approved");
  const finance = find("finance_approved");
  const paid = claim.status === "paid" ? find("paid") : undefined;
  const rejected = claim.status === "rejected" ? find("rejected") : undefined;
  const hrCurrent = ["pending_hr", "needs_revision", "finance_returned"].includes(claim.status);
  const state = (done: boolean, current: boolean) => (done ? "เสร็จสิ้น" : current ? "กำลังดำเนินการ" : "รอดำเนินการ");
  const revision = claim.status === "needs_revision" ? find("revision_requested") : undefined;

  const steps: ApprovalStep[] = [
    { title: "ส่งคำขอแล้ว", description: claim.submittedByName, date: submitted ? `${submitted.kind === "resubmitted" ? "ส่งใหม่หลังแก้ไข " : ""}${thaiDateTime(submitted.at)}` : "ยังไม่ได้ส่งคำขอ", state: state(Boolean(submitted), false), complete: Boolean(submitted), current: false },
    {
      title: "ฝ่ายบุคคลตรวจสอบ",
      description: hr?.actorName ?? "ฝ่ายบุคคล",
      date: revision?.note ? `สิ่งที่ต้องแก้ไข: ${revision.note}` : hr ? thaiDateTime(hr.at) : "ตรวจสอบสิทธิ์และเอกสารประกอบ",
      state: state(Boolean(hr) && !hrCurrent, hrCurrent),
      complete: Boolean(hr) && !hrCurrent,
      current: hrCurrent,
    },
    { title: "ฝ่ายการเงินตรวจสอบ", description: finance?.actorName ?? "ฝ่ายการเงิน", date: finance ? thaiDateTime(finance.at) : "ตรวจสอบยอดก่อนจ่าย", state: state(Boolean(finance), claim.status === "pending_finance"), complete: Boolean(finance), current: claim.status === "pending_finance" },
    { title: "จ่ายเงินและปิดคำขอ", description: "ฝ่ายการเงิน", date: paid ? thaiDateTime(paid.at) : "โอนเงินเข้าบัญชีตามรอบการจ่าย", state: state(Boolean(paid), claim.status === "awaiting_payment"), complete: Boolean(paid), current: claim.status === "awaiting_payment" },
  ];
  if (rejected) {
    steps.push({ title: "ไม่อนุมัติ", description: rejected.actorName ?? "", date: rejected.note ?? "", state: "สิ้นสุด", complete: true, current: false });
  }
  return steps;
}

function hintOf(claim: ClaimRecord): string {
  const payDate = payDateOf(claim);
  switch (claim.status) {
    case "draft":
      return `บันทึก ${thaiDate(claim.createdAt)} · ยังไม่ส่ง ไม่กันวงเงิน`;
    case "needs_revision":
      return lastEventOf(claim, "revision_requested")?.note || "HR ส่งกลับให้แก้ไข";
    case "paid":
      return payDate ? `โอนเข้าบัญชี ${thaiDate(payDate)}` : "โอนเข้าบัญชีแล้ว";
    case "rejected":
      return lastEventOf(claim, "rejected")?.note || "ไม่อนุมัติ";
    case "cancelled":
      return "ยกเลิกแล้ว คืนวงเงินให้แล้ว";
    case "awaiting_payment":
      return payDate ? `กำหนดโอน ${thaiDate(payDate)}` : LAST_STEP[claim.status];
    default:
      return payDate ? `ถ้าอนุมัติทัน ได้รับ ${thaiDate(payDate)}` : LAST_STEP[claim.status];
  }
}

/** การเงินบางรายการบันทึกค่าว่างเป็น "ไม่ระบุ" หรือ "-" จึงตัดออกก่อนแสดง */
function accountOf(payment: NonNullable<ClaimRecord["payment"]>) {
  const parts = [payment.bankCode, payment.accountMasked].map((part) => part?.trim()).filter((part) => part && part !== "-" && part !== "ไม่ระบุ");
  return parts.length > 0 ? parts.join(" ") : "ไม่ระบุ";
}

function toRequest(claim: ClaimRecord): WelfareRequest {
  const at = claim.submittedAt ?? claim.createdAt;
  const receipt = claim.receipts[0];
  const payDate = payDateOf(claim);
  const counted = RESERVED.includes(claim.status) || APPROVED.includes(claim.status);
  const facts: { label: string; value: string }[] = [
    { label: "ผู้รับสิทธิ์", value: `${claim.employeeName} · ${claim.employeeCode}` },
    { label: "ผู้ให้บริการ", value: claim.providerName || "—" },
    { label: "วันที่เกิดค่าใช้จ่าย", value: claim.expenseDate ? thaiDate(`${claim.expenseDate}T00:00:00+07:00`) : "—" },
    { label: "ยอดขอเบิก", value: baht(claim.amountRequested) },
    { label: "ยอดอนุมัติ", value: claim.amountApproved !== null ? baht(claim.amountApproved) : "รอดำเนินการ" },
    { label: "เลขที่ใบเสร็จ", value: receipt?.receiptNo || "—" },
    { label: "วงเงินสิทธิ์นี้", value: claim.limit > 0 ? `${baht(claim.limit)} · เหลือ ${baht(Math.max(claim.limit - claim.used - (counted ? countedAmount(claim) : 0), 0))} หลังเบิก` : "—" },
    ...(claim.payment ? [{ label: "บัญชีรับเงิน", value: accountOf(claim.payment) }] : []),
    ...(claim.payment?.transferRef ? [{ label: "เลขอ้างอิงการโอน", value: claim.payment.transferRef }] : []),
    ...Object.entries(claim.details).map(([label, value]) => ({ label, value })),
    ...(claim.note ? [{ label: "หมายเหตุ", value: claim.note }] : []),
  ];
  return {
    id: claim.claimNo,
    title: claim.benefitName,
    submittedAt: claim.submittedAt ? thaiDate(at) : "—",
    submittedTime: claim.submittedAt ? thaiDateTime(claim.submittedAt) : "ยังไม่ได้ส่ง",
    amount: claim.amountRequested,
    status: STATUS_MAP[claim.status],
    dbStatus: claim.status,
    statusText: CLAIM_STATUS_LABEL[claim.status],
    year: String(Number(toBangkokDate(at).slice(0, 4)) + 543),
    description: Object.entries(claim.details).map(([label, value]) => `${label}: ${value}`).join(" · ") || claim.note || "-",
    kindLabel: claim.submittedByCode === claim.employeeCode ? "ยื่นเอง" : `ยื่นแทนโดย ${claim.submittedByName}`,
    hint: hintOf(claim),
    facts,
    payNote: payDate && !["paid", "draft", "rejected", "cancelled"].includes(claim.status) ? `คาดว่าได้รับเงิน ${thaiDate(payDate)}` : null,
    reserveNote: RESERVED.includes(claim.status) ? `กันวงเงินไว้แล้ว ${baht(claim.amountRequested)} · ถ้าไม่อนุมัติจะคืนวงเงินอัตโนมัติ` : null,
    attachments: claim.attachments.map((file) => ({ id: file.id, name: file.fileName })),
    steps: stepsOf(claim),
    lastStep: LAST_STEP[claim.status],
    canEdit: claim.status === "draft" || claim.status === "needs_revision",
    canCancel: claim.status === "draft" || claim.status === "pending_hr" || claim.status === "needs_revision",
  };
}

export default async function StatusPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const claims = await listClaims({ employeeCode: session.sub });
  if (!claims) {
    return <p className="text-13 text-status-rejected">โหลดรายการคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }
  return <StatusClient initialRequests={claims.map(toRequest)} />;
}
