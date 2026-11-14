import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPaySettings, listClaims } from "@/lib/claims/service";
import { baht, bangkokToday, currentRound, payRounds, roundKeyOf, thaiDate, thaiMonthYear } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS, daysInMonth, monthOffsetLabel } from "@/features/payroll/lib/pay-settings";
import { cx } from "@/lib/cx";
import { PageHead, Pill, Sheet } from "@/features/requester/ui";

export const metadata: Metadata = { title: "รอบจ่ายเงิน" };

const COLS = "grid-cols-[180px_150px_130px_minmax(0,1fr)_120px]";

// รอบจ่ายเงินในมุมของผู้ส่งคำขอ: กติกาของแต่ละรอบ และคำขอของตัวเองตกรอบไหน
export default async function PayRoundsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [settings, claims] = await Promise.all([getPaySettings().catch(() => DEFAULT_PAY_SETTINGS), listClaims({ employeeCode: session.sub })]);
  const today = bangkokToday();
  const current = currentRound(settings, today);
  // เรียงจากรอบใหม่ไปเก่า รอบที่อยู่หลังรอบปัจจุบันในรายการจึงปิดรับไปแล้ว
  const rounds = payRounds(settings, today, 2, 1);
  const currentIndex = rounds.findIndex((round) => round.key === current.key);
  const mine = (claims ?? []).filter((claim) => claim.submittedAt && !["draft", "cancelled", "rejected"].includes(claim.status));
  const rules = [
    { roundNo: 1, range: "ยื่นวันที่ 1–15 ของเดือน", day: settings.round1PayDay, offset: settings.round1MonthOffset },
    { roundNo: 2, range: "ยื่นวันที่ 16–สิ้นเดือน", day: settings.round2PayDay, offset: settings.round2MonthOffset },
  ];

  return (
    <>
      <PageHead crumbs={[{ label: "ภาพรวม", href: "/employee" }, { label: "รอบจ่ายเงิน" }]} title="รอบจ่ายเงิน" description="สวัสดิการจ่ายเดือนละ 2 รอบ ตามวันที่ยื่นคำขอ" />

      <Sheet aria-labelledby="when-title" className="flex flex-col gap-3 px-5 py-[18px]">
        <h2 id="when-title" className="text-16 font-semibold">
          ได้เงินตอนไหน
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {rules.map((rule) => {
            const active = rule.roundNo === current.roundNo;
            return (
              <div key={rule.roundNo} className={cx("rounded-lg px-3.5 py-3", active ? "border-[1.5px] border-primary-600 bg-primary-50" : "border border-line")}>
                <p className={cx("text-12 font-semibold", active ? "text-primary-700" : "text-muted")}>
                  รอบที่ {rule.roundNo}
                  {active ? " · รอบปัจจุบัน" : ""}
                </p>
                <p className="text-14">{rule.range}</p>
                <p className="text-13 text-ink-soft">
                  ได้รับเงินวันที่{" "}
                  <b className="font-semibold">
                    {rule.day} {monthOffsetLabel(rule.offset)}
                  </b>
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-12 text-muted">ต้องผ่าน HR และการเงินอนุมัติก่อนวันจ่าย ถ้าอนุมัติไม่ทัน หรือถูกส่งกลับให้แก้ไข คำขอจะเลื่อนไปรอบถัดไป</p>
      </Sheet>

      <Sheet aria-labelledby="steps-title" className="px-5 py-[18px]">
        <h2 id="steps-title" className="mb-2.5 text-16 font-semibold">
          ขั้นตอนก่อนได้รับเงิน
        </h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-14 text-ink-soft">
          <li>ยื่นคำขอ: วันที่ยื่นเป็นตัวกำหนดรอบ</li>
          <li>HR ตรวจเอกสาร: ถ้าส่งกลับให้แก้ไข ต้องแก้แล้วส่งใหม่ก่อน HR จึงตรวจต่อ</li>
          <li>การเงินอนุมัติจ่าย: ต้องอนุมัติก่อนวันจ่ายของรอบ การเงินอาจเลื่อนวันจ่ายของบางคำขอได้</li>
          <li>โอนเข้าบัญชีรับเงินของคุณในวันจ่าย</li>
        </ol>
      </Sheet>

      <Sheet aria-labelledby="calendar-title">
        <h2 id="calendar-title" className="px-5 pt-3.5 pb-2 text-16 font-semibold">
          ปฏิทินรอบจ่ายและคำขอของคุณ
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className={`grid ${COLS} gap-3 bg-surface px-5 py-2.5 text-12 font-medium text-muted`}>
              <span>รอบ</span>
              <span>ช่วงวันที่ยื่น</span>
              <span>วันจ่าย</span>
              <span>คำขอของคุณในรอบนี้</span>
              <span>สถานะ</span>
            </div>
            {rounds.map((round, index) => {
              const isCurrent = round.key === current.key;
              const inRound = mine.filter((claim) => roundKeyOf(claim.submittedAt as string) === round.key);
              const month = thaiMonthYear(round.year, round.month);
              return (
                <div key={round.key} className={cx(`grid ${COLS} items-center gap-3 border-t border-slate-100 px-5 py-3.5`, isCurrent && "bg-primary-50/50")}>
                  <span className="font-medium">
                    รอบที่ {round.roundNo} · {month}
                  </span>
                  <span className="text-13 text-ink-soft">
                    ยื่น {round.roundNo === 1 ? "1–15" : `16–${daysInMonth(round.year, round.month)}`} {month.split(" ")[0]}
                  </span>
                  <span className="font-semibold">{thaiDate(round.payDate)}</span>
                  <span className="text-13 text-muted">
                    {inRound.length === 0
                      ? "—"
                      : inRound.map((claim, index) => (
                          <span key={claim.id}>
                            {index > 0 ? " · " : ""}
                            <Link href={`/employee/status?id=${encodeURIComponent(claim.claimNo)}`} className="text-primary-600 hover:underline">
                              {claim.claimNo}
                            </Link>{" "}
                            {baht(claim.amountRequested)}
                          </span>
                        ))}
                  </span>
                  <span>
                    {isCurrent ? (
                      <Pill tone="amber">รอบปัจจุบัน</Pill>
                    ) : round.payDate < today ? (
                      <Pill tone="blue">ถึงวันจ่ายแล้ว</Pill>
                    ) : (
                      <Pill tone="slate">{index > currentIndex ? "ปิดรับแล้ว รอจ่าย" : "รอบถัดไป"}</Pill>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {claims ? null : <p className="border-t border-slate-100 px-5 py-3 text-13 text-status-rejected">โหลดคำขอของคุณไม่สำเร็จ ตารางนี้จึงแสดงเฉพาะรอบจ่าย</p>}
      </Sheet>
    </>
  );
}
