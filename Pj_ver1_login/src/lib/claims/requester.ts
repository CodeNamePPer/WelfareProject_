// ตัวช่วยแสดงผลคำขอในมุมของผู้ส่งคำขอ ใช้ได้ทั้ง server และ client
import { DEFAULT_PAY_SETTINGS, resolvePayDate, type PaySettings } from "../../features/payroll/lib/pay-settings";
import type { ClaimDbStatus, ClaimRecord } from "./types";

const TZ = "Asia/Bangkok";

export const baht = (value: number) => `฿${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}`;

/** ISO (วันที่หรือวันเวลา) -> 25 พ.ย. 2569 */
export function thaiDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

/** ISO -> 25 พ.ย. (ไม่มีปี) */
export function thaiDayMonth(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: TZ });
}

export function thaiTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export const bangkokToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

/** สถานะที่กันวงเงินไว้แต่ยังไม่อนุมัติจ่าย */
export const RESERVED: ClaimDbStatus[] = ["pending_hr", "needs_revision", "pending_finance", "finance_returned"];
export const APPROVED: ClaimDbStatus[] = ["awaiting_payment", "paid"];
/** ผู้ส่งคำขอต้องลงมือทำเอง */
export const TODO: ClaimDbStatus[] = ["needs_revision", "draft"];
export const DONE: ClaimDbStatus[] = ["paid", "rejected", "cancelled"];

/** คำขอตอนนี้อยู่ที่ใคร */
export const HOLDER: Record<ClaimDbStatus, string> = {
  draft: "คุณ · ยังไม่ได้ส่ง",
  pending_hr: "HR · ตรวจเอกสาร",
  needs_revision: "คุณ · แก้ไขแล้วส่ง HR",
  pending_finance: "การเงิน · ตรวจก่อนจ่าย",
  finance_returned: "HR · การเงินส่งกลับ",
  awaiting_payment: "การเงิน · รอโอนตามรอบ",
  paid: "จบแล้ว",
  rejected: "จบแล้ว",
  cancelled: "จบแล้ว",
};

/** ยอดที่นับกับวงเงิน: ยอดอนุมัติถ้ามี ไม่เช่นนั้นใช้ยอดที่ขอ */
export const countedAmount = (claim: ClaimRecord) => claim.amountApproved ?? claim.amountRequested;

/** วันจ่ายของคำขอ: วันที่โอนจริง > วันที่การเงินเลื่อน > วันจ่ายของรอบ */
export function payDateOf(claim: ClaimRecord): string | null {
  if (claim.status === "paid" && claim.payment?.paidAt) return claim.payment.paidAt;
  if (claim.status === "draft" || claim.status === "rejected" || claim.status === "cancelled") return null;
  return claim.payDateOverride ?? claim.payRoundDate;
}

export function lastEventOf(claim: ClaimRecord, kind: ClaimRecord["events"][number]["kind"]) {
  return [...claim.events].reverse().find((event) => event.kind === kind);
}

export type PayRound = { key: string; year: number; month: number; roundNo: 1 | 2; payDate: string };

/** รอบจ่ายของเดือนรอบ ๆ วันนี้ เรียงจากรอบใหม่ไปเก่า (monthsBack/monthsAhead นับจากเดือนปัจจุบัน) */
export function payRounds(settings: PaySettings = DEFAULT_PAY_SETTINGS, today = bangkokToday(), monthsBack = 2, monthsAhead = 1): PayRound[] {
  const [year, month] = today.split("-").map(Number);
  const rounds: PayRound[] = [];
  for (let offset = monthsAhead; offset >= -monthsBack; offset -= 1) {
    const total = month - 1 + offset;
    const y = year + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12 + 1;
    for (const roundNo of [2, 1] as const) {
      rounds.push({ key: `${y}-${m}-${roundNo}`, year: y, month: m, roundNo, payDate: resolvePayDate(y, m, roundNo, settings) });
    }
  }
  return rounds;
}

/** รอบที่คำขอซึ่งยื่นวันนี้จะตกอยู่ */
export function currentRound(settings: PaySettings = DEFAULT_PAY_SETTINGS, today = bangkokToday()): PayRound {
  const [year, month, day] = today.split("-").map(Number);
  const roundNo = day <= 15 ? 1 : 2;
  return { key: `${year}-${month}-${roundNo}`, year, month, roundNo, payDate: resolvePayDate(year, month, roundNo, settings) };
}

/** วันจ่ายที่ใกล้ที่สุดนับจากวันนี้ */
export function nextPayDate(settings: PaySettings = DEFAULT_PAY_SETTINGS, today = bangkokToday()): string {
  const upcoming = payRounds(settings, today, 2, 2).map((round) => round.payDate).filter((date) => date >= today).sort();
  return upcoming[0] ?? currentRound(settings, today).payDate;
}

/** รอบของวันที่ยื่น ใช้จับคู่คำขอกับปฏิทินรอบจ่าย */
export function roundKeyOf(submittedAt: string) {
  const [year, month, day] = new Date(submittedAt).toLocaleDateString("sv-SE", { timeZone: TZ }).split("-").map(Number);
  return `${year}-${month}-${day <= 15 ? 1 : 2}`;
}

export const thaiMonthYear = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "UTC" });
