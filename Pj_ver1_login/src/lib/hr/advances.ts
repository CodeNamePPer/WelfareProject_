import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { getClaim } from "@/lib/claims/service";
import type { ClaimRecord } from "@/lib/claims/types";

// ตรวจใบเสร็จเบิกล่วงหน้า (ดีไซน์ H13) อ่านและบันทึกตาราง welfare_claim_advance (migration 20261114100000)
// กติกา: ใบเสร็จมากกว่ายอดล่วงหน้า = จ่ายเพิ่มไม่เกินวงเงินคงเหลือ · น้อยกว่า = ผู้ขอคืนส่วนต่าง · เกินกำหนดแนบ = ยกเลิก

export type AdvanceStatus = "awaiting_receipt" | "receipt_submitted" | "receipt_returned" | "settled" | "cancelled_overdue";
export type AdvanceSettlement = "extra_payment" | "refund" | "exact";
export type AdvanceAction = "approve" | "return" | "cancel_overdue";

export type ClaimAdvance = {
  id: string;
  status: AdvanceStatus;
  advanceAmount: number;
  advancePaidAt: string | null;
  /** YYYY-MM-DD */
  receiptDueDate: string;
  receiptAmount: number | null;
  receiptSubmittedAt: string | null;
  settlement: AdvanceSettlement | null;
  extraAmountApproved: number | null;
  refundAmount: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  cancelledAt: string | null;
};

export class AdvanceInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type AdvanceRow = {
  id: string;
  status: AdvanceStatus;
  advance_amount: number | string;
  advance_paid_at: string | null;
  receipt_due_date: string;
  receipt_amount: number | string | null;
  receipt_submitted_at: string | null;
  settlement: AdvanceSettlement | null;
  extra_amount_approved: number | string | null;
  refund_amount: number | string | null;
  reviewed_at: string | null;
  review_note: string | null;
  cancelled_at: string | null;
};

const COLUMNS =
  "id, status, advance_amount, advance_paid_at, receipt_due_date, receipt_amount, receipt_submitted_at, settlement, extra_amount_approved, refund_amount, reviewed_at, review_note, cancelled_at";
const num = (value: number | string | null) => (value === null ? null : Number(value));
const round2 = (value: number) => Math.round(value * 100) / 100;
const bangkokToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

/** คำขอพร้อมรายการเงินล่วงหน้า (null = ไม่พบคำขอ หรือคำขอนี้ไม่ใช่เบิกล่วงหน้า) */
export async function getClaimAdvance(claimNo: string): Promise<{ claim: ClaimRecord; advance: ClaimAdvance } | null> {
  const claim = await getClaim(claimNo);
  if (!claim) return null;
  const { data, error } = await supabaseAdmin.from("welfare_claim_advance").select(COLUMNS).eq("claim_id", claim.id).maybeSingle<AdvanceRow>();
  if (error) throw error;
  if (!data) return null;
  return {
    claim,
    advance: {
      id: data.id,
      status: data.status,
      advanceAmount: Number(data.advance_amount),
      advancePaidAt: data.advance_paid_at,
      receiptDueDate: data.receipt_due_date,
      receiptAmount: num(data.receipt_amount),
      receiptSubmittedAt: data.receipt_submitted_at,
      settlement: data.settlement,
      extraAmountApproved: num(data.extra_amount_approved),
      refundAmount: num(data.refund_amount),
      reviewedAt: data.reviewed_at,
      reviewNote: data.review_note,
      cancelledAt: data.cancelled_at,
    },
  };
}

export type AdvanceSummary = {
  /** ใบเสร็จ − ยอดล่วงหน้า (null = ยังไม่มีใบเสร็จ) */
  difference: number | null;
  /** วงเงินคงเหลือของสิทธิ์นี้หลังหักยอดล่วงหน้า (null = ไม่มีเพดาน) */
  remainingLimit: number | null;
  /** จ่ายเพิ่มได้สูงสุด */
  maxExtra: number;
  /** ส่วนที่เกินวงเงิน ผู้ขอรับผิดชอบเอง */
  overLimit: number;
  /** ผู้ขอต้องคืน */
  refund: number;
  overdue: boolean;
};

/** สรุปยอดตามกติกา ใช้ทั้งหน้าจอและตอนบันทึก */
export function summarizeAdvance(claim: ClaimRecord, advance: ClaimAdvance, today = bangkokToday()): AdvanceSummary {
  const difference = advance.receiptAmount === null ? null : round2(advance.receiptAmount - advance.advanceAmount);
  // claim.used ไม่รวมคำขอนี้ ยอดล่วงหน้าของคำขอนี้ใช้วงเงินไปแล้ว
  const remainingLimit = claim.limit > 0 ? Math.max(0, round2(claim.limit - claim.used - advance.advanceAmount)) : null;
  const extraWanted = difference !== null && difference > 0 ? difference : 0;
  const maxExtra = remainingLimit === null ? extraWanted : Math.min(extraWanted, remainingLimit);
  return {
    difference,
    remainingLimit,
    maxExtra: round2(maxExtra),
    overLimit: round2(extraWanted - maxExtra),
    refund: difference !== null && difference < 0 ? round2(-difference) : 0,
    overdue: (advance.status === "awaiting_receipt" || advance.status === "receipt_returned") && advance.receiptDueDate < today,
  };
}

/**
 * บันทึกผลการตรวจใบเสร็จ: เขียน welfare_claim_advance แล้วเพิ่มประวัติใน welfare_claim_event
 * เฉพาะ HR และต้องไม่ใช่เจ้าของคำขอ
 */
export async function settleAdvance(claimNo: string, input: { action: AdvanceAction; extraAmount?: number; note: string }, actor: { sub: string; role: string }) {
  if (actor.role !== "HR") throw new AdvanceInputError("ตรวจใบเสร็จเบิกล่วงหน้าได้เฉพาะ HR", 403);
  const found = await getClaimAdvance(claimNo);
  if (!found) throw new AdvanceInputError("ไม่พบรายการเบิกล่วงหน้าของคำขอนี้", 404);
  const { claim, advance } = found;
  if (claim.employeeCode === actor.sub) throw new AdvanceInputError("ตรวจใบเสร็จของคำขอตัวเองไม่ได้ ต้องให้ HR คนอื่นตรวจ", 403);

  const { data: reviewer } = await supabaseAdmin.from("employee").select("id").eq("employee_code", actor.sub).is("deleted_at", null).maybeSingle();
  if (!reviewer) throw new AdvanceInputError("ไม่พบผู้ตรวจในระบบ", 403);

  const note = input.note.trim();
  const summary = summarizeAdvance(claim, advance);
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;
  let event: { kind: string; note: string | null; amount_before: number | null; amount_after: number | null };

  if (input.action === "approve") {
    if (advance.status !== "receipt_submitted" || advance.receiptAmount === null || summary.difference === null) throw new AdvanceInputError("รายการนี้ไม่ได้รอตรวจใบเสร็จ", 409);
    const base = { status: "settled", reviewed_by: reviewer.id, reviewed_at: now, review_note: note || null };
    if (summary.difference > 0) {
      const extra = input.extraAmount ?? Number.NaN;
      if (!Number.isFinite(extra) || extra < 0) throw new AdvanceInputError("กรุณาระบุยอดจ่ายเพิ่มที่อนุมัติ");
      if (round2(extra) > summary.maxExtra) throw new AdvanceInputError(`ยอดจ่ายเพิ่มต้องไม่เกิน ${summary.maxExtra.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท (ส่วนต่างใบเสร็จและวงเงินคงเหลือ)`);
      if (round2(extra) !== summary.maxExtra && !note) throw new AdvanceInputError("กรุณาระบุเหตุผลที่ปรับยอดจ่ายเพิ่ม");
      patch = { ...base, settlement: "extra_payment", extra_amount_approved: round2(extra), refund_amount: null };
      event = { kind: "receipt_approved", note: note || null, amount_before: advance.advanceAmount, amount_after: round2(advance.advanceAmount + extra) };
    } else if (summary.difference < 0) {
      patch = { ...base, settlement: "refund", refund_amount: summary.refund, extra_amount_approved: null };
      event = { kind: "receipt_approved", note: note || `ผู้ขอคืนส่วนต่าง ${summary.refund.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`, amount_before: advance.advanceAmount, amount_after: advance.receiptAmount };
    } else {
      patch = { ...base, settlement: "exact", extra_amount_approved: null, refund_amount: null };
      event = { kind: "receipt_approved", note: note || null, amount_before: advance.advanceAmount, amount_after: advance.receiptAmount };
    }
  } else if (input.action === "return") {
    if (advance.status !== "receipt_submitted") throw new AdvanceInputError("รายการนี้ไม่ได้รอตรวจใบเสร็จ", 409);
    if (!note) throw new AdvanceInputError("กรุณาระบุสิ่งที่ผู้ขอต้องแนบใหม่");
    patch = { status: "receipt_returned", reviewed_by: reviewer.id, reviewed_at: now, review_note: note };
    event = { kind: "receipt_returned", note, amount_before: null, amount_after: null };
  } else if (input.action === "cancel_overdue") {
    if (!summary.overdue) throw new AdvanceInputError("ยกเลิกได้เฉพาะรายการที่เกินกำหนดแนบใบเสร็จ", 409);
    const reason = note || "เกินกำหนดแนบใบเสร็จ";
    patch = { status: "cancelled_overdue", cancelled_at: now, settlement: "refund", refund_amount: advance.advanceAmount, extra_amount_approved: null, reviewed_by: reviewer.id, reviewed_at: now, review_note: reason };
    event = { kind: "advance_cancelled", note: reason, amount_before: advance.advanceAmount, amount_after: 0 };
  } else {
    throw new AdvanceInputError("ไม่รู้จักการกระทำนี้");
  }

  // เงื่อนไข status เดิมกันการบันทึกซ้อนจากสองหน้าจอ
  const { data: updated, error } = await supabaseAdmin.from("welfare_claim_advance").update(patch).eq("id", advance.id).eq("status", advance.status).select("id");
  if (error) throw error;
  if (!updated || updated.length === 0) throw new AdvanceInputError("รายการนี้ถูกบันทึกไปแล้ว กรุณารีเฟรชหน้า", 409);

  const { error: eventError } = await supabaseAdmin
    .from("welfare_claim_event")
    .insert({ claim_id: claim.id, ...event, from_status: claim.status, to_status: claim.status, actor_employee_id: reviewer.id, actor_role: "HR" });
  if (eventError) {
    // ประวัติเขียนไม่ได้: บันทึกไว้ให้ตามแก้ ผลการตรวจยังอยู่ใน welfare_claim_advance (reviewed_by / reviewed_at / review_note)
    console.error("[hr advances] event write failed", { claimNo, action: input.action }, eventError);
  }
  return { status: patch.status as AdvanceStatus };
}
