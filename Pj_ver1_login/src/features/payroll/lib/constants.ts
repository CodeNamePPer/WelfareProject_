import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import type { PaymentStatus, RoundNo, WelfareType } from "./types";

/** ชื่อภาษาไทยของสวัสดิการแต่ละประเภท */
export const WELFARE_LABEL: Record<WelfareType, string> = {
  medical: "ค่ารักษาพยาบาล",
  education: "ค่าเล่าเรียน",
  dental: "ทันตกรรม",
  self_dev: "ค่าพัฒนาตัวเอง",
  accident: "ค่าอุบัติเหตุ",
  other: "อื่น ๆ",
};

/** ใช้ทำตัวเลือกใน dropdown */
export const WELFARE_OPTIONS = (Object.keys(WELFARE_LABEL) as WelfareType[]).map((value) => ({
  value,
  label: WELFARE_LABEL[value],
}));

/**
 * ข้อความ + สีของแต่ละสถานะ (Style Guide ข้อ 1 "สีสถานะคำขอ")
 * text/bg/dot คือ class ของ Tailwind ที่มาจาก token ใน globals.css
 */
export const STATUS_META: Record<PaymentStatus, { label: string; text: string; bg: string; dot: string }> = {
  draft: { label: CLAIM_STATUS_LABEL.draft, text: "text-status-draft", bg: "bg-status-draft/10", dot: "bg-status-draft" },
  review: { label: "รอตรวจสอบ", text: "text-status-pending-ink", bg: "bg-status-pending/10", dot: "bg-status-pending" },
  approved: { label: CLAIM_STATUS_LABEL.pending_finance, text: "text-status-approved-ink", bg: "bg-status-approved/10", dot: "bg-status-approved" },
  pending: { label: CLAIM_STATUS_LABEL.awaiting_payment, text: "text-status-pending-ink", bg: "bg-status-pending/10", dot: "bg-status-pending" },
  returned: { label: CLAIM_STATUS_LABEL.finance_returned, text: "text-status-rejected", bg: "bg-status-rejected/10", dot: "bg-status-rejected" },
  paid: { label: CLAIM_STATUS_LABEL.paid, text: "text-primary-600", bg: "bg-primary-600/10", dot: "bg-primary-600" },
  rejected: { label: CLAIM_STATUS_LABEL.rejected, text: "text-status-rejected", bg: "bg-status-rejected/10", dot: "bg-status-rejected" },
};

export const ROUND_LABEL: Record<RoundNo, string> = { 1: "รอบที่ 1", 2: "รอบที่ 2" };
export const ROUND_RANGE: Record<RoundNo, string> = {
  1: "วันที่ 1–15 ของเดือน",
  2: "วันที่ 16–สิ้นเดือน",
};

/** จำนวนแถวต่อหน้าของตาราง */
export const PAGE_SIZE = 10;
