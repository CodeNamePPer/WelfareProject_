import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getFinanceData } from "@/lib/payroll/finance";
import { thaiDate } from "@/lib/claims/requester";
import { HrPage } from "@/features/hr/ui";
import { HistoryClient, type HistoryRound } from "./HistoryClient";
import { toBangkokDate } from "@/lib/claims/mappers";

export const metadata: Metadata = { title: "ดูข้อมูลย้อนหลัง" };
export const dynamic = "force-dynamic";

// F08 ดูข้อมูลย้อนหลัง: รอบที่จ่ายหรือปิดแล้ว (Admin เปิดดูได้ แต่ไม่เห็นปุ่ม Export)
export default async function HistoryPage() {
  const [data, session] = await Promise.all([getFinanceData(), getSession()]);
  if (!data) return <p className="text-13 text-status-rejected-ink">โหลดข้อมูลย้อนหลังไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const rounds: HistoryRound[] = [...data.rounds.values()]
    .filter((round) => (round.state === "paid" || round.payDate < data.today) && round.count > 0)
    .sort((a, b) => b.payDate.localeCompare(a.payDate))
    .map((round) => {
      const items = data.claims.filter((item) => item.roundKey === round.key && item.claim.status === "paid");
      return {
        key: round.key,
        year: Number(round.payDate.slice(0, 4)) + 543,
        label: round.label,
        payDate: thaiDate(round.payDate),
        count: items.length,
        total: items.reduce((sum, item) => sum + item.amount, 0),
      };
    });

  // โอนไม่สำเร็จแยกตามปี (พ.ศ.) และแก้แล้วหรือยัง (ภายหลังโอนสำเร็จ)
  const paidNos = new Set(data.claims.filter((item) => item.claim.status === "paid").map((item) => item.claim.claimNo));
  const failures = data.payments
    .filter((payment) => payment.status === "failed")
    .map((payment) => ({ year: Number(toBangkokDate(payment.createdAt).slice(0, 4)) + 543, fixed: paidNos.has(payment.claimNo) }));

  return (
    <HrPage>
      <HistoryClient rounds={rounds} failures={failures} canExport={session?.role === "FINANCE"} currentYear={Number(data.today.slice(0, 4)) + 543} />
    </HrPage>
  );
}
