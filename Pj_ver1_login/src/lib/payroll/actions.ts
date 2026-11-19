import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { ClaimInputError, applyClaimAction, getClaim, getPaySettings, notifyClaim, type ClaimActor } from "@/lib/claims/service";
import { bangkokToday, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS, resolvePayDate } from "@/features/payroll/lib/pay-settings";
import { keyOf, nextRoundOf, parseRoundKey } from "./finance";

// คำสั่งของการเงินที่ไม่มีใน applyClaimAction (ดีไซน์ F06, F07, F09)
// ทุกคำสั่งบันทึกประวัติลง welfare_claim_event เพื่อให้ผู้ขอเห็นในหน้าติดตามสถานะและแจ้งเตือน

type Actor = { sub: string; role: string };

async function actorId(actor: Actor) {
  if (actor.role !== "FINANCE") throw new ClaimInputError("ไม่มีสิทธิ์ดำเนินการ");
  const { data, error } = await supabaseAdmin.from("employee").select("id").eq("employee_code", actor.sub).maybeSingle();
  if (error) throw error;
  if (!data) throw new ClaimInputError("ไม่พบข้อมูลผู้ดำเนินการ");
  return data.id as string;
}

async function claimRow(claimNo: string) {
  const { data, error } = await supabaseAdmin
    .from("welfare_claim")
    .select("id, status, employee_id, pay_round_id, amount_requested, amount_approved")
    .eq("claim_no", claimNo)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ClaimInputError("ไม่พบคำขอนี้");
  return data as { id: string; status: string; employee_id: string; pay_round_id: string | null; amount_requested: number | string; amount_approved: number | string | null };
}

async function addEvent(claimId: string, kind: string, actor: string, note: string, status: string) {
  const { error } = await supabaseAdmin
    .from("welfare_claim_event")
    .insert({ claim_id: claimId, kind, from_status: status, to_status: status, actor_employee_id: actor, actor_role: "FINANCE", note });
  if (error) throw error;
}

/** รอบในฐานข้อมูล (สร้างเมื่อยังไม่มี) */
async function ensureRound(year: number, month: number, roundNo: 1 | 2, payDate?: string) {
  const settings = await getPaySettings().catch(() => DEFAULT_PAY_SETTINGS);
  const { error } = await supabaseAdmin
    .from("welfare_pay_round")
    .upsert({ year, month, round_no: roundNo, pay_date: payDate ?? resolvePayDate(year, month, roundNo, settings) }, { onConflict: "year,month,round_no", ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: selectError } = await supabaseAdmin.from("welfare_pay_round").select("id, pay_date, status").eq("year", year).eq("month", month).eq("round_no", roundNo).single();
  if (selectError) throw selectError;
  return data as { id: string; pay_date: string; status: string };
}

/**
 * บันทึกผลการโอน 1 รายการ (F06)
 *   สำเร็จ    -> welfare_claim_record_payment (สถานะเป็นจ่ายแล้ว)
 *   ไม่สำเร็จ -> แถวการโอนสถานะ failed พร้อมเหตุผล คำขอยังรอจ่าย รอยกไปรอบถัดไป
 */
export async function recordPaymentResult(claimNo: string, input: { result: "success" | "failed"; ref?: string; reason?: string }, actor: Actor) {
  if (input.result === "success") {
    await applyClaimAction(claimNo, { action: "pay", transferRef: input.ref }, { sub: actor.sub, role: actor.role as ClaimActor["role"] });
    return;
  }
  const reason = input.reason?.trim();
  if (!reason) throw new ClaimInputError("กรุณาระบุสาเหตุที่โอนไม่สำเร็จ");
  const by = await actorId(actor);
  const claim = await claimRow(claimNo);
  if (claim.status !== "awaiting_payment" || !claim.pay_round_id) throw new ClaimInputError("คำขอนี้ไม่ได้อยู่ในสถานะรอจ่าย กรุณาโหลดหน้าใหม่");
  const { data: account } = await supabaseAdmin
    .from("employee_bank_account")
    .select("id, bank_code, account_no_masked")
    .eq("employee_id", claim.employee_id)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();
  const amount = Number(claim.amount_approved ?? claim.amount_requested);
  const { error } = await supabaseAdmin.from("welfare_claim_payment").insert({
    claim_id: claim.id,
    pay_round_id: claim.pay_round_id,
    bank_account_id: account?.id ?? null,
    bank_code: account?.bank_code ?? "ไม่ระบุ",
    account_no_masked: account?.account_no_masked ?? "-",
    amount_gross: amount,
    amount_net: amount,
    status: "failed",
    failure_reason: reason,
    prepared_by: by,
  });
  if (error) throw error;
  await addEvent(claim.id, "payment_failed", by, `โอนไม่สำเร็จ: ${reason}`, claim.status);
  notifyClaim(claimNo, "payment_failed", actor.sub, reason);
}

/** โอนไม่สำเร็จ: ยกคำขอไปรอบจ่ายถัดไป (F06 "โอนใหม่รอบถัดไป") */
export async function carryToNextRound(claimNo: string, actor: Actor) {
  const by = await actorId(actor);
  const claim = await claimRow(claimNo);
  if (claim.status !== "awaiting_payment" || !claim.pay_round_id) throw new ClaimInputError("คำขอนี้ไม่ได้อยู่ในสถานะรอจ่าย กรุณาโหลดหน้าใหม่");
  const { data: failed, error: failedError } = await supabaseAdmin
    .from("welfare_claim_payment")
    .select("id")
    .eq("claim_id", claim.id)
    .eq("pay_round_id", claim.pay_round_id)
    .eq("status", "failed")
    .limit(1);
  if (failedError) throw failedError;
  if (!failed?.length) throw new ClaimInputError("ยกไปรอบถัดไปได้เฉพาะรายการที่โอนไม่สำเร็จ");
  const { data: round, error: roundError } = await supabaseAdmin.from("welfare_pay_round").select("year, month, round_no").eq("id", claim.pay_round_id).single();
  if (roundError) throw roundError;

  // รอบถัดไปที่ยังเปิดและวันจ่ายยังไม่ผ่าน
  const today = bangkokToday();
  let next = nextRoundOf(round.year, round.month, round.round_no as 1 | 2);
  let target = await ensureRound(next.year, next.month, next.roundNo);
  for (let guard = 0; guard < 6 && (target.status !== "open" || target.pay_date < today); guard += 1) {
    next = nextRoundOf(next.year, next.month, next.roundNo);
    target = await ensureRound(next.year, next.month, next.roundNo);
  }
  const { error } = await supabaseAdmin.from("welfare_claim").update({ pay_round_id: target.id, pay_date_override: null }).eq("id", claim.id);
  if (error) throw error;
  await addEvent(claim.id, "pay_date_changed", by, `โอนไม่สำเร็จ ยกไปรอบจ่าย ${thaiDate(target.pay_date)}`, claim.status);
  notifyClaim(claimNo, "pay_date_changed", actor.sub, "โอนไม่สำเร็จ ยกไปรอบจ่ายถัดไป");
}

/**
 * เลื่อนวันจ่ายของทั้งรอบ (F07): เปลี่ยนวันจ่ายของรอบ และตั้งวันจ่ายใหม่ให้ทุกคำขอในรอบ
 * (คำขอที่รอการเงินอนุมัติยังไม่ผูกรอบ จึงเลื่อนด้วย pay_date_override ผ่าน welfare_claim_set_pay_date ซึ่งบันทึกประวัติให้)
 */
export async function rescheduleRound(key: string, date: string, reason: string, actor: Actor): Promise<{ notified: number }> {
  const by = await actorId(actor);
  const parsed = parseRoundKey(key);
  if (!parsed) throw new ClaimInputError("ไม่พบรอบจ่ายนี้");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < bangkokToday()) throw new ClaimInputError("วันจ่ายใหม่ต้องไม่ย้อนหลัง");
  const note = reason.trim();
  if (!note) throw new ClaimInputError("กรุณาระบุเหตุผลที่เลื่อนวันจ่าย");

  const round = await ensureRound(parsed.year, parsed.month, parsed.roundNo);
  if (round.status !== "open") throw new ClaimInputError("รอบนี้จ่ายหรือปิดแล้ว เลื่อนวันจ่ายไม่ได้");
  if (round.pay_date === date) throw new ClaimInputError("วันจ่ายใหม่ต้องไม่ตรงกับวันจ่ายเดิม");

  // คำขอในรอบ: ผูกรอบนี้แล้ว หรือยังรอการเงินและยื่นในช่วงของรอบนี้
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${parsed.year}-${pad(parsed.month)}-${parsed.roundNo === 1 ? "01" : "16"}T00:00:00+07:00`;
  const next = nextRoundOf(parsed.year, parsed.month, parsed.roundNo);
  const end = `${next.year}-${pad(next.month)}-${next.roundNo === 1 ? "01" : "16"}T00:00:00+07:00`;
  const [boundAll, unbound] = await Promise.all([
    supabaseAdmin.from("welfare_claim").select("id, claim_no, employee_id, status").eq("pay_round_id", round.id).is("deleted_at", null),
    supabaseAdmin
      .from("welfare_claim")
      .select("id, claim_no, employee_id")
      .is("pay_round_id", null)
      .eq("status", "pending_finance")
      .gte("submitted_at", start)
      .lt("submitted_at", end)
      .is("deleted_at", null),
  ]);
  if (boundAll.error) throw boundAll.error;
  if (unbound.error) throw unbound.error;
  const boundRows = boundAll.data ?? [];
  const activeBound = boundRows.filter((c) => c.status === "pending_finance" || c.status === "awaiting_payment");
  if (boundRows.length > 0 && boundRows.every((c) => c.status === "paid") && (unbound.data ?? []).length === 0) {
    throw new ClaimInputError("รอบนี้จ่ายแล้ว เลื่อนวันจ่ายไม่ได้");
  }
  const { error } = await supabaseAdmin.from("welfare_pay_round").update({ pay_date: date }).eq("id", round.id);
  if (error) throw error;

  const claims = [...activeBound, ...(unbound.data ?? [])];
  for (const claim of claims) {
    const { error: rpcError } = await supabaseAdmin.rpc("welfare_claim_set_pay_date", {
      p_claim_id: claim.id,
      p_date: date,
      p_actor: by,
      p_actor_role: actor.role,
      p_note: `เลื่อนวันจ่ายรอบ ${keyOf(parsed.year, parsed.month, parsed.roundNo)} จาก ${thaiDate(round.pay_date)} เป็น ${thaiDate(date)}: ${note}`,
    });
    if (rpcError) throw rpcError;
    notifyClaim(claim.claim_no as string, "pay_date_changed", actor.sub, note);
  }
  return { notified: new Set(claims.map((claim) => claim.employee_id)).size };
}

/** บันทึกรับเงินคืนจากพนักงาน (F09) */
export async function recordRefund(claimNo: string, actor: Actor) {
  const by = await actorId(actor);
  const claim = await getClaim(claimNo);
  if (!claim) throw new ClaimInputError("ไม่พบคำขอนี้");
  const { data, error } = await supabaseAdmin
    .from("welfare_claim_advance")
    .select("id, refund_amount, refund_received_at")
    .eq("claim_id", claim.id)
    .maybeSingle<{ id: string; refund_amount: number | string | null; refund_received_at: string | null }>();
  if (error) throw error;
  const amount = Number(data?.refund_amount ?? 0);
  if (!data || !(amount > 0)) throw new ClaimInputError("คำขอนี้ไม่มียอดที่ต้องคืน");
  if (data.refund_received_at) throw new ClaimInputError("บันทึกรับคืนไปแล้ว กรุณาโหลดหน้าใหม่");
  const { error: updateError } = await supabaseAdmin.from("welfare_claim_advance").update({ refund_received_at: new Date().toISOString() }).eq("id", data.id).is("refund_received_at", null);
  if (updateError) throw updateError;
  const received = `รับเงินคืน ${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`;
  await addEvent(claim.id, "refund_received", by, received, claim.status);
  notifyClaim(claimNo, "refund_received", actor.sub, received);
}
