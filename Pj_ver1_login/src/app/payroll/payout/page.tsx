import type { Metadata } from "next";
import { getFinanceData, nextRoundOf, keyOf, parseRoundKey } from "@/lib/payroll/finance";
import { buildPayout, defaultPayoutKey } from "@/lib/payroll/payout";
import { thaiDayMonth } from "@/lib/claims/requester";
import { HrPage } from "@/features/hr/ui";
import { PayoutTable } from "@/features/finance/PayoutTable";

export const metadata: Metadata = { title: "บันทึกการโอน" };
export const dynamic = "force-dynamic";

// F06 บันทึกการโอนของรอบ (?round=ปี-เดือน-รอบ) ค่าเริ่มต้นคือรอบที่มีรายการรอโอนและถึงก่อน
export default async function PayoutPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const [data, params] = await Promise.all([getFinanceData(), searchParams]);
  if (!data) return <p className="text-13 text-status-rejected-ink">โหลดรายการโอนไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const key = params.round && data.rounds.has(params.round) ? params.round : defaultPayoutKey(data);
  const payout = key ? await buildPayout(data, key) : null;
  if (!payout) {
    return (
      <HrPage>
        <PayoutTable title="บันทึกการโอน" subtitle="ยังไม่มีรอบที่มีรายการอนุมัติจ่าย" rows={[]} fileName="bank-file" nextPayDate={null} />
      </HrPage>
    );
  }
  const parsed = parseRoundKey(payout.round.key);
  const after = parsed ? nextRoundOf(parsed.year, parsed.month, parsed.roundNo) : null;
  const next = after ? data.rounds.get(keyOf(after.year, after.month, after.roundNo)) : null;
  return (
    <HrPage>
      <PayoutTable
        title={payout.title}
        subtitle={payout.subtitle}
        rows={payout.rows}
        fileName={`ไฟล์ธนาคาร-${payout.round.payDate}`}
        nextPayDate={next ? thaiDayMonth(next.payDate) : null}
      />
    </HrPage>
  );
}
