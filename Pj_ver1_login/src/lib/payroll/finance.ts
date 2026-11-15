import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { getHrEmployees, type HrEmployee } from "@/lib/hr/employees";
import { getPaySettings, listClaims } from "@/lib/claims/service";
import { bangkokToday, roundKeyOf, thaiMonthYear } from "@/lib/claims/requester";
import type { ClaimDbStatus, ClaimRecord } from "@/lib/claims/types";
import { DEFAULT_PAY_SETTINGS, cutoffDateOf, daysInMonth, resolvePayDate, type PaySettings } from "@/features/payroll/lib/pay-settings";

// ข้อมูลของหน้าการเงิน (ดีไซน์ F01–F09) อ่านจากตารางเดิมทั้งหมด:
//   welfare_claim / welfare_pay_round / welfare_claim_payment / welfare_claim_advance / employee_bank_account
// รอบของคำขอ: ถ้าการเงินอนุมัติแล้วใช้รอบที่ผูกไว้ (pay_round_id) ไม่เช่นนั้นใช้รอบของวันที่ยื่น (กติกาเดียวกับ ensurePayRound)

export const FIN_STATUSES: ClaimDbStatus[] = ["pending_finance", "finance_returned", "awaiting_payment", "paid"];

export type FinPerson = { name: string; code: string; position: string | null; department: string | null };

export type RoundState = "not_started" | "open" | "closed" | "paid";

export type FinRound = {
  key: string;
  id: string | null;
  year: number;
  month: number;
  roundNo: 1 | 2;
  /** "รอบที่ 1 · พ.ย. 2569" */
  label: string;
  /** "1–15 พ.ย." */
  period: string;
  start: string;
  end: string;
  payDate: string;
  cutoff: string;
  state: RoundState;
  count: number;
  total: number;
};

export type FinClaim = {
  claim: ClaimRecord;
  person: FinPerson;
  roundKey: string | null;
  payDate: string | null;
  amount: number;
  hrApprovedAt: string | null;
  hrApprovedBy: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const shortMonth = (year: number, month: number) => new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("th-TH", { month: "short", timeZone: "UTC" });

export const keyOf = (year: number, month: number, roundNo: number) => `${year}-${month}-${roundNo}`;

export function parseRoundKey(key: string | undefined | null): { year: number; month: number; roundNo: 1 | 2 } | null {
  const match = /^(\d{4})-(\d{1,2})-([12])$/.exec(key ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month, roundNo: Number(match[3]) as 1 | 2 };
}

/** รอบที่ถัดจากรอบนี้ */
export function nextRoundOf(year: number, month: number, roundNo: 1 | 2) {
  if (roundNo === 1) return { year, month, roundNo: 2 as const };
  return month === 12 ? { year: year + 1, month: 1, roundNo: 1 as const } : { year, month: month + 1, roundNo: 1 as const };
}

function roundBase(year: number, month: number, roundNo: 1 | 2) {
  const last = daysInMonth(year, month);
  const start = `${year}-${pad(month)}-${roundNo === 1 ? "01" : "16"}`;
  const end = `${year}-${pad(month)}-${roundNo === 1 ? "15" : pad(last)}`;
  const m = shortMonth(year, month);
  return {
    key: keyOf(year, month, roundNo),
    year,
    month,
    roundNo,
    label: `รอบที่ ${roundNo} · ${thaiMonthYear(year, month)}`,
    period: roundNo === 1 ? `1–15 ${m}` : `16–${last} ${m}`,
    start,
    end,
  };
}

type PayRoundRow = { id: string; year: number; month: number; round_no: number; pay_date: string; status: "open" | "closed" | "paid" };
type ClaimRoundRow = { claim_no: string; pay_round_id: string | null };

export type PaymentRow = {
  claimNo: string;
  roundId: string;
  status: "preparing" | "transferred" | "failed" | "reversed";
  transferRef: string | null;
  failureReason: string | null;
  bankCode: string;
  accountMasked: string;
  amount: number;
  paidAt: string | null;
  createdAt: string;
};

export type FinanceData = {
  settings: PaySettings;
  today: string;
  claims: FinClaim[];
  rounds: Map<string, FinRound>;
  payments: PaymentRow[];
  employees: Map<string, HrEmployee>;
};

/** สถานะของรอบตามวันนี้: ยังไม่เริ่ม / เปิดอยู่ / ปิดรอบแล้ว / จ่ายแล้ว */
function stateOf(round: Omit<FinRound, "state" | "count" | "total">, today: string, dbStatus: PayRoundRow["status"] | null, items: FinClaim[]): RoundState {
  if (dbStatus === "paid") return "paid";
  if (items.length > 0 && items.every((item) => item.claim.status === "paid" || item.claim.status === "cancelled")) return "paid";
  if (today < round.start) return "not_started";
  if (today > round.cutoff || dbStatus === "closed") return "closed";
  return "open";
}

/** โอนเงินแล้ว: จ่ายแล้ว หรือยกเลิกหลังโอน (เบิกล่วงหน้าเกินกำหนด เงินออกไปแล้วจริง) */
export function isTransferred(claim: { status: ClaimDbStatus; payment?: { paidAt: string | null } | null }) {
  return claim.status === "paid" || (claim.status === "cancelled" && Boolean(claim.payment?.paidAt));
}

/** โหลดข้อมูลทั้งหมดที่หน้าการเงินใช้ (null = โหลดไม่สำเร็จ) */
export async function getFinanceData(): Promise<FinanceData | null> {
  const [claims, employees, settings, roundsRes, claimRoundsRes, paymentsRes] = await Promise.all([
    // รวมคำขอที่ยกเลิกหลังโอนแล้ว (เบิกล่วงหน้าเกินกำหนด) เพื่อให้ประวัติรอบจ่ายยังเห็นยอดที่โอนไปจริง
    listClaims({ statuses: [...FIN_STATUSES, "cancelled"] }),
    getHrEmployees(),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    supabaseAdmin.from("welfare_pay_round").select("id, year, month, round_no, pay_date, status").returns<PayRoundRow[]>(),
    supabaseAdmin.from("welfare_claim").select("claim_no, pay_round_id").not("pay_round_id", "is", null).is("deleted_at", null).returns<ClaimRoundRow[]>(),
    supabaseAdmin
      .from("welfare_claim_payment")
      .select("pay_round_id, status, transfer_ref, failure_reason, bank_code, account_no_masked, amount_net, paid_at, created_at, claim:claim_id(claim_no)")
      .order("created_at", { ascending: true })
      .returns<
        {
          pay_round_id: string;
          status: PaymentRow["status"];
          transfer_ref: string | null;
          failure_reason: string | null;
          bank_code: string;
          account_no_masked: string;
          amount_net: number | string;
          paid_at: string | null;
          created_at: string;
          claim: { claim_no: string };
        }[]
      >(),
  ]);
  if (!claims || roundsRes.error || claimRoundsRes.error || paymentsRes.error) {
    console.error("[payroll] getFinanceData failed", roundsRes.error ?? claimRoundsRes.error ?? paymentsRes.error);
    return null;
  }

  const today = bangkokToday();
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
  const dbRounds = new Map(roundsRes.data.map((row) => [keyOf(row.year, row.month, row.round_no), row]));
  const keyById = new Map(roundsRes.data.map((row) => [row.id, keyOf(row.year, row.month, row.round_no)]));
  const roundIdOf = new Map(claimRoundsRes.data.map((row) => [row.claim_no, row.pay_round_id]));

  const finClaims: FinClaim[] = claims
    // คำขอที่ HR ปฏิเสธโดยไม่เคยผ่านการเงินไม่เกี่ยวกับการเงิน
    .filter((claim) => claim.status !== "rejected" && (claim.status !== "cancelled" || Boolean(claim.payment?.paidAt)))
    .map((claim) => {
      const employee = byCode.get(claim.employeeCode);
      const roundId = roundIdOf.get(claim.claimNo);
      const roundKey = (roundId ? keyById.get(roundId) : null) ?? (claim.submittedAt ? roundKeyOf(claim.submittedAt) : null);
      const hr = [...claim.events].reverse().find((event) => event.kind === "hr_approved") ?? null;
      return {
        claim,
        person: { name: employee?.name ?? claim.employeeName, code: claim.employeeCode, position: employee?.position ?? null, department: employee?.department ?? claim.department },
        roundKey,
        payDate: null,
        amount: claim.amountApproved ?? claim.amountRequested,
        hrApprovedAt: hr?.at ?? null,
        hrApprovedBy: hr?.actorName ?? null,
      };
    });

  // รอบที่แสดง: รอบที่มีในฐานข้อมูล + รอบของคำขอ + รอบปัจจุบันกับรอบถัดไป
  const keys = new Set<string>([...dbRounds.keys(), ...finClaims.flatMap((item) => (item.roundKey ? [item.roundKey] : []))]);
  const [ty, tm, td] = today.split("-").map(Number);
  const current = { year: ty, month: tm, roundNo: (td <= 15 ? 1 : 2) as 1 | 2 };
  const next = nextRoundOf(current.year, current.month, current.roundNo);
  keys.add(keyOf(current.year, current.month, current.roundNo));
  keys.add(keyOf(next.year, next.month, next.roundNo));

  const rounds = new Map<string, FinRound>();
  for (const key of keys) {
    const parsed = parseRoundKey(key);
    if (!parsed) continue;
    const db = dbRounds.get(key) ?? null;
    const base = roundBase(parsed.year, parsed.month, parsed.roundNo);
    const payDate = db?.pay_date ?? resolvePayDate(parsed.year, parsed.month, parsed.roundNo, settings);
    const items = finClaims.filter((item) => item.roundKey === key);
    const partial = { ...base, id: db?.id ?? null, payDate, cutoff: cutoffDateOf(payDate, settings) };
    rounds.set(key, { ...partial, state: stateOf(partial, today, db?.status ?? null, items), count: items.length, total: items.reduce((sum, item) => sum + item.amount, 0) });
  }

  for (const item of finClaims) {
    const round = item.roundKey ? rounds.get(item.roundKey) : null;
    item.payDate = (item.claim.status === "paid" || item.claim.status === "cancelled") && item.claim.payment?.paidAt ? item.claim.payment.paidAt.slice(0, 10) : (item.claim.payDateOverride ?? round?.payDate ?? null);
  }

  const payments: PaymentRow[] = paymentsRes.data.map((row) => ({
    claimNo: row.claim.claim_no,
    roundId: row.pay_round_id,
    status: row.status,
    transferRef: row.transfer_ref,
    failureReason: row.failure_reason,
    bankCode: row.bank_code,
    accountMasked: row.account_no_masked,
    amount: Number(row.amount_net),
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }));

  return { settings, today, claims: finClaims, rounds, payments, employees: byCode };
}

/** รอบที่คำขอที่ยื่นวันนี้จะตกอยู่ */
export function currentRoundKey(today = bangkokToday()) {
  const [year, month, day] = today.split("-").map(Number);
  return keyOf(year, month, day <= 15 ? 1 : 2);
}

/** วันระหว่างสองวันที่ "YYYY-MM-DD" */
export function daysFrom(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** บัญชีหลักของพนักงานหลายคน (ชื่อธนาคาร ••• เลขท้าย) */
export async function getPrimaryAccounts(employeeCodes: string[]): Promise<Map<string, { bankCode: string; accountMasked: string }>> {
  if (employeeCodes.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from("employee_bank_account")
    .select("bank_code, account_no_masked, owner:employee_id!inner(employee_code)")
    .eq("is_primary", true)
    .is("deleted_at", null)
    .in("owner.employee_code", employeeCodes)
    .returns<{ bank_code: string; account_no_masked: string; owner: { employee_code: string } }[]>();
  if (error) {
    console.error("[payroll] getPrimaryAccounts failed", error);
    return new Map();
  }
  return new Map(data.map((row) => [row.owner.employee_code, { bankCode: row.bank_code, accountMasked: row.account_no_masked }]));
}

/** "กรุงไทย ••• 7731" จากเลขแบบปิดบัง */
export function accountLabel(account: { bankCode: string; accountMasked: string } | null | undefined) {
  const digits = account?.accountMasked.replace(/\D/g, "") ?? "";
  // การโอนที่บันทึกตอนไม่มีบัญชีหลักเก็บ "ไม่ระบุ" / "-" ไว้
  if (!account || (account.bankCode === "ไม่ระบุ" && !digits)) return "ไม่มีบัญชีรับเงิน";
  return `${account.bankCode} ••• ${digits.slice(-4) || account.accountMasked}`;
}

// ─── เบิกล่วงหน้า (F03, F09) ────────────────────────────────────────────────

export type AdvanceItem = {
  claimNo: string;
  claimStatus: ClaimDbStatus;
  person: FinPerson;
  benefitName: string;
  status: "awaiting_receipt" | "receipt_submitted" | "receipt_returned" | "settled" | "cancelled_overdue";
  advanceAmount: number;
  advancePaidAt: string | null;
  receiptDueDate: string;
  receiptAmount: number | null;
  settlement: "extra_payment" | "refund" | "exact" | null;
  extraAmountApproved: number | null;
  refundAmount: number | null;
  refundReceivedAt: string | null;
  cancelledAt: string | null;
  reviewedAt: string | null;
  /** วงเงินคงเหลือของสิทธิ์นี้ (null = ไม่มีเพดาน) */
  remaining: number | null;
};

type AdvanceDbRow = {
  status: AdvanceItem["status"];
  advance_amount: number | string;
  advance_paid_at: string | null;
  receipt_due_date: string;
  receipt_amount: number | string | null;
  settlement: AdvanceItem["settlement"];
  extra_amount_approved: number | string | null;
  refund_amount: number | string | null;
  refund_received_at: string | null;
  cancelled_at: string | null;
  reviewed_at: string | null;
  claim: { claim_no: string; deleted_at: string | null };
};

const num = (value: number | string | null) => (value === null ? null : Number(value));

/** รายการเบิกล่วงหน้าทั้งหมด (null = โหลดไม่สำเร็จ) */
export async function getAdvanceItems(): Promise<AdvanceItem[] | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_claim_advance")
    .select(
      "status, advance_amount, advance_paid_at, receipt_due_date, receipt_amount, settlement, extra_amount_approved, refund_amount, refund_received_at, cancelled_at, reviewed_at, claim:claim_id!inner(claim_no, deleted_at)",
    )
    .order("receipt_due_date", { ascending: true })
    .returns<AdvanceDbRow[]>();
  if (error) {
    console.error("[payroll] getAdvanceItems failed", error);
    return null;
  }
  const rows = data.filter((row) => !row.claim.deleted_at);
  if (rows.length === 0) return [];
  const [claims, employees] = await Promise.all([listClaims(), getHrEmployees()]);
  if (!claims) return null;
  const byNo = new Map(claims.map((claim) => [claim.claimNo, claim]));
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
  return rows.flatMap((row) => {
    const claim = byNo.get(row.claim.claim_no);
    if (!claim) return [];
    const employee = byCode.get(claim.employeeCode);
    return [
      {
        claimNo: claim.claimNo,
        claimStatus: claim.status,
        person: { name: employee?.name ?? claim.employeeName, code: claim.employeeCode, position: employee?.position ?? null, department: employee?.department ?? claim.department },
        benefitName: claim.benefitName,
        status: row.status,
        advanceAmount: Number(row.advance_amount),
        advancePaidAt: row.advance_paid_at,
        receiptDueDate: row.receipt_due_date,
        receiptAmount: num(row.receipt_amount),
        settlement: row.settlement,
        extraAmountApproved: num(row.extra_amount_approved),
        refundAmount: num(row.refund_amount),
        refundReceivedAt: row.refund_received_at,
        cancelledAt: row.cancelled_at,
        reviewedAt: row.reviewed_at,
        remaining: claim.limit > 0 ? Math.max(claim.limit - claim.used - (claim.amountApproved ?? claim.amountRequested), 0) : null,
      },
    ];
  });
}

/** อายุงานจากวันเริ่มงาน เช่น "7 ปี" / "8 ปี 7 เดือน" */
export function tenureOf(hireDate: string, today = new Date()) {
  const start = new Date(`${hireDate}T00:00:00+07:00`);
  let months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
  if (today.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : "", !years && !rest ? "ไม่ถึง 1 เดือน" : ""].filter(Boolean).join(" ");
}
