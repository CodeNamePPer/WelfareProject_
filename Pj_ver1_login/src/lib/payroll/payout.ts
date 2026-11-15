import "server-only";
import { thaiDate } from "@/lib/claims/requester";
import { accountLabel, getPrimaryAccounts, type FinRound, type FinanceData, type FinPerson } from "./finance";

// ข้อมูลหน้าบันทึกการโอน (F06) และรายการของรอบในข้อมูลย้อนหลัง (F08)

export type PayoutResult = "success" | "failed" | "none";

export type PayoutRow = {
  claimNo: string;
  person: FinPerson;
  account: string;
  accountMasked: string;
  bankCode: string;
  amount: number;
  result: PayoutResult;
  /** เลขอ้างอิงเมื่อโอนสำเร็จ หรือสาเหตุเมื่อโอนไม่สำเร็จ */
  note: string | null;
  /** โอนไม่สำเร็จและยังยกไปรอบถัดไปได้ */
  canCarry: boolean;
};

export type Payout = {
  round: FinRound;
  title: string;
  subtitle: string;
  rows: PayoutRow[];
};

/** รอบที่หน้าบันทึกการโอนเปิดเป็นค่าเริ่มต้น: รอบที่มีรายการรอโอนและถึงก่อน ไม่มีก็รอบล่าสุดที่มีรายการ */
export function defaultPayoutKey(data: FinanceData): string | null {
  const rounds = [...data.rounds.values()];
  const waiting = rounds
    .filter((round) => data.claims.some((item) => item.roundKey === round.key && item.claim.status === "awaiting_payment"))
    .sort((a, b) => a.payDate.localeCompare(b.payDate));
  if (waiting[0]) return waiting[0].key;
  const latest = rounds.filter((round) => round.count > 0).sort((a, b) => b.payDate.localeCompare(a.payDate));
  return latest[0]?.key ?? null;
}

export async function buildPayout(data: FinanceData, key: string): Promise<Payout | null> {
  const round = data.rounds.get(key);
  if (!round) return null;
  const items = data.claims.filter((item) => item.roundKey === key && (item.claim.status === "awaiting_payment" || item.claim.status === "paid"));
  const accounts = await getPrimaryAccounts([...new Set(items.map((item) => item.person.code))]);

  const rows: PayoutRow[] = items.map((item) => {
    const payments = data.payments.filter((payment) => payment.claimNo === item.claim.claimNo && payment.roundId === round.id);
    const latest = payments[payments.length - 1] ?? null;
    const result: PayoutResult = item.claim.status === "paid" ? "success" : latest?.status === "failed" ? "failed" : "none";
    const fromPayment = latest ? { bankCode: latest.bankCode, accountMasked: latest.accountMasked } : null;
    const account = (result === "success" ? fromPayment : null) ?? accounts.get(item.person.code) ?? fromPayment;
    return {
      claimNo: item.claim.claimNo,
      person: item.person,
      account: accountLabel(account),
      accountMasked: account?.accountMasked ?? "",
      bankCode: account?.bankCode ?? "",
      amount: item.amount,
      result,
      note: result === "success" ? (item.claim.payment?.transferRef ?? latest?.transferRef ?? null) : result === "failed" ? latest?.failureReason ?? null : null,
      canCarry: result === "failed",
    };
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const closed = round.state === "closed" || round.state === "paid" || data.today > round.cutoff;
  return {
    round,
    title: `บันทึกการโอน · รอบ ${thaiDate(round.payDate)}`,
    subtitle: `${rows.length} รายการ · ฿${total.toLocaleString("th-TH", { maximumFractionDigits: 2 })} · ${closed ? "ปิดรอบแล้ว" : "ปิดรอบ"} ${new Date(`${round.cutoff}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" })}`,
    rows,
  };
}
