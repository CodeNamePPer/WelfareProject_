import type { Metadata } from "next";
import { getFinanceData } from "@/lib/payroll/finance";
import { thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS, resolvePayDate } from "@/features/payroll/lib/pay-settings";
import { parseRoundKey } from "@/lib/payroll/finance";
import { HrPage } from "@/features/hr/ui";
import { RoundsClient, type RoundRow } from "./RoundsClient";

export const metadata: Metadata = { title: "ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย" };
export const dynamic = "force-dynamic";

/** รอบย้อนหลังที่แสดงในตาราง */
const PAST_ROUNDS = 6;

// F02 ตั้งค่ารอบจ่าย + F07 เลื่อนวันจ่ายของรอบ
export default async function RoundsPage() {
  const data = await getFinanceData();
  if (!data) return <p className="text-13 text-status-rejected-ink">โหลดรอบจ่ายไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const all = [...data.rounds.values()];
  // รอบที่ยังไม่จ่าย (เรียงจากใกล้ไปไกล) ตามด้วยรอบที่จ่ายหรือปิดไปแล้ว (เรียงจากใหม่ไปเก่า)
  const upcoming = all.filter((round) => round.state === "open" || round.state === "not_started" || (round.state === "closed" && round.payDate >= data.today)).sort((a, b) => a.payDate.localeCompare(b.payDate));
  const past = all
    .filter((round) => !upcoming.includes(round) && round.count > 0)
    .sort((a, b) => b.payDate.localeCompare(a.payDate))
    .slice(0, PAST_ROUNDS);

  const toRow = (round: (typeof all)[number]): RoundRow => {
    const parsed = parseRoundKey(round.key);
    const scheduled = parsed ? resolvePayDate(parsed.year, parsed.month, parsed.roundNo, data.settings) : round.payDate;
    return {
    key: round.key,
    year: parsed?.year ?? 0,
    month: parsed?.month ?? 0,
    roundNo: parsed?.roundNo ?? 1,
    scheduled: thaiDate(scheduled),
    moved: scheduled !== round.payDate,
    label: round.label,
    period: round.period,
    payDate: thaiDate(round.payDate),
    payDateIso: round.payDate,
    cutoff: thaiDayMonth(round.cutoff),
    count: round.count,
    total: round.total,
    state: round.state,
    people: new Set(data.claims.filter((item) => item.roundKey === round.key && (item.claim.status === "pending_finance" || item.claim.status === "awaiting_payment")).map((item) => item.person.code)).size,
    canReschedule: round.state !== "paid" && round.payDate >= data.today,
    };
  };

  const settings = data.settings;
  return (
    <HrPage>
      <RoundsClient
        settings={{
          round1PayDay: settings.round1PayDay,
          round1MonthOffset: settings.round1MonthOffset,
          round2PayDay: settings.round2PayDay,
          round2MonthOffset: settings.round2MonthOffset,
          cutoffDays: settings.cutoffDays ?? DEFAULT_PAY_SETTINGS.cutoffDays ?? 5,
        }}
        upcoming={upcoming.map(toRow)}
        past={past.map(toRow)}
        today={data.today}
      />
    </HrPage>
  );
}
