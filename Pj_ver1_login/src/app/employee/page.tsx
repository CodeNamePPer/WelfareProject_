import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits, getPaySettings, listClaims } from "@/lib/claims/service";
import { getMyProfile } from "@/lib/employee/profile";
import { APPROVAL_FLOW } from "@/lib/claims/forms";
import { APPROVED, HOLDER, RESERVED, baht, bangkokToday, countedAmount, lastEventOf, nextPayDate, payDateOf, thaiDate } from "@/lib/claims/requester";
import type { EmployeeBenefit } from "@/lib/claims/types";
import { BenefitThumb, ClaimPill, EmptyNote, RowLink, Sheet, UsageBar, pill } from "@/features/requester/ui";

const BUDGET_TYPE = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };
// ตาม R01: คอลัมน์ 1.7fr / 1.3fr / 110 / 120 / 120 / 130 ทุกขนาดจอ จอแคบเลื่อนแนวนอนในกล่อง
// กว้างขั้นต่ำ 900px ให้ "อยู่ที่ใคร" ที่ยาวที่สุดยังอยู่บรรทัดเดียว
const CLAIM_COLS = "grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_110px_120px_120px_130px]";

/** วงเงินเทียบเป็นต่อปี สวัสดิการที่จ่ายต่อครั้งไม่มีเพดานรายปีจึงไม่นับ */
const yearlyLimit = (benefit: EmployeeBenefit) => (benefit.budgetType === "yearly" ? benefit.limit : benefit.budgetType === "monthly" ? benefit.limit * 12 : 0);

function claimsNote(benefit: EmployeeBenefit) {
  return benefit.maxClaims !== null ? `เบิกแล้ว ${benefit.claimsThisYear}/${benefit.maxClaims} ครั้ง` : "ไม่จำกัดครั้ง";
}

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, benefits, claims, paySettings] = await Promise.all([
    getMyProfile(session.sub),
    getEmployeeBenefits(session.sub),
    listClaims({ employeeCode: session.sub }),
    getPaySettings().catch(() => undefined),
  ]);
  if (!profile || !benefits || !claims) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลสวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  const today = bangkokToday();
  const year = today.slice(0, 4);
  const thaiYear = Number(year) + 543;
  // นับตามปีของวันที่เกิดค่าใช้จ่าย กฎเดียวกับวงเงินในฐานข้อมูล
  const thisYear = claims.filter((claim) => claim.expenseDate?.slice(0, 4) === year);
  const used = thisYear.filter((claim) => APPROVED.includes(claim.status)).reduce((sum, claim) => sum + countedAmount(claim), 0);
  const reserved = thisYear.filter((claim) => RESERVED.includes(claim.status)).reduce((sum, claim) => sum + countedAmount(claim), 0);
  const total = benefits.reduce((sum, benefit) => sum + yearlyLimit(benefit), 0);
  const available = Math.max(total - used - reserved, 0);
  const claimCount = thisYear.filter((claim) => APPROVED.includes(claim.status) || RESERVED.includes(claim.status)).length;
  const paidThisYear = thisYear.filter((claim) => claim.status === "paid").reduce((sum, claim) => sum + countedAmount(claim), 0);
  const awaiting = thisYear.filter((claim) => claim.status === "awaiting_payment").reduce((sum, claim) => sum + countedAmount(claim), 0);

  const toRevise = claims.filter((claim) => claim.status === "needs_revision");
  const recent = claims.filter((claim) => claim.status !== "cancelled").slice(0, 5);
  // สิทธิ์ที่มีการใช้ขึ้นก่อน จะได้เห็นยอดที่เปลี่ยนจริง
  const shownBenefits = [...benefits].sort((a, b) => b.used + b.pending - (a.used + a.pending)).slice(0, 8);

  return (
    <>
      <Sheet aria-label="โปรไฟล์" className="overflow-hidden">
        <div className="h-24 bg-blue-900" />
        <div className="flex flex-wrap items-end gap-4 px-6">
          <div aria-hidden="true" className="-mt-[52px] flex size-[104px] shrink-0 items-center justify-center rounded-full border-4 border-white bg-primary-100 text-[32px] font-semibold text-primary-700">
            {profile.initials}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="text-22 font-semibold">{profile.name}</h1>
            <p className="text-14 text-ink-soft">{[profile.position, profile.department].filter(Boolean).join(" · ") || "ยังไม่ระบุตำแหน่ง"}</p>
            <p className="text-12 text-muted">
              {profile.code}
              {profile.managerName ? ` · หัวหน้า: ${profile.managerName}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap border-t border-line">
          <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-2.5 px-6 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-12 text-muted">วงเงินที่ใช้ได้ ปี {thaiYear}</p>
                <p className="text-[26px] leading-tight font-semibold tabular-nums">
                  {baht(available)} <span className="text-14 font-normal text-muted">จากวงเงินทั้งหมด {baht(total)}</span>
                </p>
              </div>
              <p className="text-right text-12 text-muted">
                รวมวงเงินรายปีและรายเดือน
                <br />
                รีเซ็ต 1 ม.ค. {thaiYear + 1}
              </p>
            </div>
            <UsageBar size="lg" used={used} pending={reserved} limit={total} label={`ใช้ไปแล้ว ${baht(used)} กันวงเงินไว้ ${baht(reserved)}`} />
            <ul className="flex flex-wrap gap-5 text-13">
              <Legend swatch="bg-primary-700" label="ใช้ไปแล้ว" value={baht(used)} />
              <Legend swatch="bg-amber-500" label="กันวงเงินไว้ (รอตรวจ)" value={baht(reserved)} />
              <Legend swatch="border border-slate-300 bg-mist" label="ใช้ได้" value={baht(available)} />
            </ul>
            <p className="text-12 text-muted">คำขอที่รอตรวจจะถูกกันวงเงินไว้ทันทีที่ยื่น ถ้าไม่อนุมัติหรือยกเลิก ระบบคืนวงเงินให้อัตโนมัติ</p>
          </div>
          <div className="flex flex-[1_1_200px] flex-col gap-1.5 border-line px-6 py-4 max-lg:border-t lg:border-l">
            <p className="text-12 text-muted">จำนวนครั้งที่เบิกปีนี้</p>
            <p className="text-[20px] font-semibold tabular-nums">
              {claimCount} <span className="text-14 font-normal text-muted">ครั้ง</span>
            </p>
            <p className="text-12 text-muted">นับคำขอที่ยื่นแล้วทุกสถานะ ยกเว้นยกเลิกและไม่อนุมัติ</p>
          </div>
          <div className="flex flex-[1_1_200px] flex-col gap-1 border-line px-6 py-4 max-lg:border-t lg:border-l">
            <p className="text-12 text-muted">รอบจ่ายถัดไป</p>
            <p className="text-[20px] font-semibold">{thaiDate(nextPayDate(paySettings, today))}</p>
            <p className="text-12 text-muted">คำขอที่อนุมัติครบก่อนวันจ่าย</p>
            <Link href="/employee/rounds" className="text-12 text-primary-600 hover:text-primary-700 hover:underline">
              ดูรอบจ่าย ›
            </Link>
          </div>
        </div>

        <nav aria-label="ส่วนของหน้า" className="flex flex-wrap gap-1 border-t border-line px-4 text-14">
          <span aria-current="page" className="border-b-2 border-primary-600 px-2.5 py-3 font-semibold text-ink">
            สิทธิ์สวัสดิการ
          </span>
          <Link href="/employee/status" className="px-2.5 py-3 text-muted hover:text-ink">
            คำขอของฉัน
          </Link>
          <Link href="/employee/profile" className="px-2.5 py-3 text-muted hover:text-ink">
            ข้อมูลส่วนตัว
          </Link>
        </nav>
      </Sheet>

      {toRevise.length > 0 ? (
        <section aria-label="ต้องทำ" className="flex flex-col gap-2">
          {toRevise.map((claim) => (
            <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-800">
              <div className="min-w-0">
                <p className="font-semibold">
                  HR ส่งคำขอกลับให้แก้ไข: {claim.claimNo} {claim.benefitName} {baht(claim.amountRequested)}
                </p>
                <p className="text-12">{lastEventOf(claim, "revision_requested")?.note || "เปิดคำขอเพื่อดูสิ่งที่ต้องแก้ไข"}</p>
              </div>
              <Link
                href={`/employee/withdraw?claim=${encodeURIComponent(claim.claimNo)}`}
                className="inline-flex h-[34px] items-center rounded-full border border-orange-600 bg-white px-3.5 text-13 font-medium text-orange-800 hover:bg-orange-100"
              >
                แก้ไขคำขอ
              </Link>
            </div>
          ))}
        </section>
      ) : null}

      <Sheet aria-labelledby="my-claims-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
          <h2 id="my-claims-title" className="text-16 font-semibold">
            คำขอของฉันและยอดจ่าย
          </h2>
          <Link href="/employee/status" className="text-13 text-primary-600 hover:text-primary-700 hover:underline">
            ดูทั้งหมด ›
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyNote>
            ยังไม่มีคำขอ{" "}
            <Link href="/employee/withdraw" className="text-primary-600 hover:underline">
              ยื่นคำขอแรกของคุณ
            </Link>
          </EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className={`grid ${CLAIM_COLS} items-center gap-3 bg-surface px-5 py-2 text-12 font-medium text-muted`}>
                <span>คำขอ</span>
                <span>อยู่ที่ใคร</span>
                <span className="text-right">ยอดขอเบิก</span>
                <span className="text-right">ยอดจ่าย</span>
                <span>วันจ่าย</span>
                <span>สถานะ</span>
              </div>
              {recent.map((claim) => {
                const payDate = payDateOf(claim);
                return (
                  <RowLink
                    key={claim.id}
                    href={claim.status === "draft" || claim.status === "needs_revision" ? `/employee/withdraw?claim=${encodeURIComponent(claim.claimNo)}` : `/employee/status?id=${encodeURIComponent(claim.claimNo)}`}
                    className={`${CLAIM_COLS} py-3`}
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-medium">{claim.benefitName}</span>
                      <span className="block text-12 text-muted">{claim.claimNo}</span>
                    </span>
                    <span className="whitespace-nowrap text-13 text-ink-soft">{HOLDER[claim.status]}</span>
                    <span className="text-right tabular-nums">{baht(claim.amountRequested)}</span>
                    <span className="text-right tabular-nums">
                      {APPROVED.includes(claim.status) ? <b className="font-semibold">{baht(countedAmount(claim))}</b> : <span className="text-muted">{claim.status === "rejected" ? "ไม่จ่าย" : "รอดำเนินการ"}</span>}
                    </span>
                    <span className="text-13 text-ink-soft">{payDate ? thaiDate(payDate) : "—"}</span>
                    <span>
                      <ClaimPill status={claim.status} />
                    </span>
                  </RowLink>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-3 border-t border-line px-5 py-3 text-13">
          <span className="text-muted">ลำดับผู้อนุมัติ: {APPROVAL_FLOW}</span>
          <span>
            รับเงินแล้วปีนี้ <b className="font-semibold tabular-nums">{baht(paidThisYear)}</b> · รอจ่าย <b className="font-semibold tabular-nums">{baht(awaiting)}</b>
          </span>
        </div>
      </Sheet>

      <Sheet aria-labelledby="my-benefits-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
          <h2 id="my-benefits-title" className="text-16 font-semibold">
            สิทธิ์สวัสดิการของฉัน
          </h2>
          <Link href="/employee/welfare" className="text-13 text-primary-600 hover:text-primary-700 hover:underline">
            ดูทั้งหมด {benefits.length} รายการ ›
          </Link>
        </div>
        {shownBenefits.length === 0 ? (
          <EmptyNote>ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้</EmptyNote>
        ) : (
          <ul className="grid gap-3 px-5 pt-1 pb-5 md:grid-cols-2">
            {shownBenefits.map((benefit) => {
              const outOfClaims = benefit.maxClaims !== null && benefit.claimsThisYear >= benefit.maxClaims;
              return (
                <li key={benefit.code} className="flex items-center gap-3.5 rounded-lg border border-line px-3.5 py-3">
                  <BenefitThumb category={benefit.category} className="size-16 rounded-lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="break-words font-semibold">{benefit.name}</p>
                    <p className="text-12 text-muted">
                      {BUDGET_TYPE[benefit.budgetType]} · {claimsNote(benefit)} · วงเงิน {baht(benefit.limit)}
                    </p>
                    <UsageBar used={benefit.used} pending={benefit.pending} limit={benefit.limit} />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-14 font-semibold tabular-nums ${outOfClaims ? "text-status-pending-ink" : "text-ink"}`}>{outOfClaims ? "ครบจำนวนครั้งแล้ว" : `คงเหลือ ${baht(benefit.remaining)}`}</p>
                    <Link
                      href={`/employee/welfare/${encodeURIComponent(benefit.code)}`}
                      aria-label={`ดูรายละเอียด ${benefit.name}`}
                      className="text-13 font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      ดูรายละเอียด ›
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-end border-t border-line px-5 py-3">
          <Link href="/employee/withdraw" className={pill.primary}>
            ยื่นคำขอใหม่
          </Link>
        </div>
      </Sheet>
    </>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-2.5 rounded-sm ${swatch}`} />
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
