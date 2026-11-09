import type { PaymentRequest, PayRound } from "./types";

/** รวมคำขอเป็นรอบจ่าย: 1 รอบ = (ปี, เดือน, รอบที่, ประเภทสวัสดิการ) */
export function buildRounds(requests: PaymentRequest[]): PayRound[] {
  const map = new Map<string, PayRound>();
  for (const r of requests) {
    const { year, month } = { year: Number(r.requestDate.slice(0, 4)), month: Number(r.requestDate.slice(5, 7)) };
    const key = `${year}-${month}-${r.round}-${r.welfare}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { id: key, round: r.round, year, month, welfare: r.welfare, payDate: r.payDate, status: r.status });
    } else if (r.status === "pending") {
      existing.status = "pending"; // ถ้ายังมีรายการรอจ่ายอยู่ ถือว่ารอบนี้ยังรอจ่าย
    }
  }
  return [...map.values()].sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
}
