import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits, listClaims } from "@/lib/claims/service";
import type { ClaimRecord } from "@/lib/claims/types";

const number = new Intl.NumberFormat("th-TH");
const thaiDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

const PENDING: ClaimRecord["status"][] = ["pending_hr", "needs_revision", "pending_finance", "finance_returned"];
const APPROVED: ClaimRecord["status"][] = ["awaiting_payment", "paid"];

const STATUS_TEXT: Record<ClaimRecord["status"], string> = {
  draft: "ฉบับร่าง",
  pending_hr: "กำลังตรวจสอบ",
  needs_revision: "รอคุณแก้ไข",
  pending_finance: "การเงินกำลังตรวจสอบ",
  finance_returned: "กำลังตรวจสอบ",
  awaiting_payment: "อนุมัติแล้ว รอจ่าย",
  paid: "จ่ายแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิกแล้ว",
};

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [benefits, claims] = await Promise.all([getEmployeeBenefits(session.sub), listClaims({ employeeCode: session.sub })]);
  if (!benefits || !claims) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลสวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  const visible = claims.filter((claim) => claim.status !== "cancelled");
  const pendingCount = visible.filter((claim) => PENDING.includes(claim.status)).length;
  const approvedCount = visible.filter((claim) => APPROVED.includes(claim.status)).length;
  const draftCount = visible.filter((claim) => claim.status === "draft").length;
  const recent = visible.slice(0, 3);
  // สิทธิ์ที่ใช้ไปแล้วขึ้นก่อน เพื่อให้เห็นยอดที่เปลี่ยนแปลงจริง
  const topBenefits = [...benefits].sort((a, b) => b.used + b.pending - (a.used + a.pending)).slice(0, 3);
  const year = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 4);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className='flex flex-col gap-1'>
          <h1 className='text-22 font-semibold tracking-tight text-ink'>ภาพรวมสวัสดิการของฉัน</h1>
          <p className='text-13 text-muted'>ตรวจสอบสิทธิ์สวัสดิการของคุณได้ที่นี่</p>
        </div>
        <Link href="/employee/withdraw" className='inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-13 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'>
          ยื่นคำขอใหม่
        </Link>
      </div>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className='font-medium text-ink'>สิทธิ์คงเหลือของฉัน</h2>
        <div className='flex items-center justify-between gap-4 text-13'>
          <span className='text-muted'>1 ม.ค. – 31 ธ.ค. {Number(year) + 543}</span>
          <Link href="/employee/welfare" className='inline-flex shrink-0 items-center gap-1 text-primary-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'>
            ดูสิทธิ์ทั้งหมด <ArrowRight className="inline-block size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-13 lg:grid-cols-3">
        {topBenefits.map((benefit) => {
          const percent = benefit.limit > 0 ? Math.min(100, Math.round((benefit.remaining / benefit.limit) * 100)) : 0;
          return (
            <article key={benefit.code} className='rounded-lg border border-line bg-white p-5 transition-colors hover:border-primary-100'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <p className='text-14 font-semibold text-ink'>{benefit.name}</p>
                <span className='shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-12 font-medium text-primary-700'>ต่อ{benefit.budgetLabel}</span>
              </div>
              <div className='mb-3 flex items-end gap-2'>
                <span className='text-24 font-semibold tabular-nums text-ink'>{number.format(benefit.remaining)}</span>
                <span className='pb-1 text-12 text-muted'>บาทคงเหลือ</span>
              </div>
              <div className='mb-3 h-2 w-full overflow-hidden rounded-full bg-primary-50' role='progressbar' aria-label={`วงเงิน${benefit.name}คงเหลือ`} aria-valuemin={0} aria-valuemax={benefit.limit} aria-valuenow={benefit.remaining}>
                <div className='h-full rounded-full bg-primary-600' style={{ width: `${percent}%` }}></div>
              </div>
              <div className='flex items-center justify-between text-12 text-muted'>
                <span>ใช้แล้ว{benefit.pending > 0 ? ` · รอตรวจ ${number.format(benefit.pending)}` : ""}</span>
                <span className='font-medium tabular-nums text-ink-soft'>{number.format(benefit.used)} / {number.format(benefit.limit)} บาท</span>
              </div>
            </article>
          );
        })}
        {topBenefits.length === 0 ? <p className='text-muted'>ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้</p> : null}
      </div>
      <div className='my-2'>
        <p className='text-13 text-muted'>วงเงินคงเหลือหักทั้งรายการที่อนุมัติแล้วและรายการที่รอตรวจ</p>
      </div>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>คำขอทั้งหมด <span className='text-22 font-semibold tabular-nums text-ink'>{visible.length}</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>รออนุมัติ <span className='text-22 font-semibold tabular-nums text-ink'>{pendingCount}</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>อนุมัติแล้ว <span className='text-22 font-semibold tabular-nums text-ink'>{approvedCount}</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>ฉบับร่าง <span className='text-22 font-semibold tabular-nums text-ink'>{draftCount}</span></div>
      </div>
      <div className='mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]'>
        <section className='min-w-0 rounded-lg border border-line bg-white p-4 sm:p-5' aria-labelledby='recent-requests-title'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 id='recent-requests-title' className='text-17 font-semibold'>คำขอล่าสุด</h2>
            <Link href="/employee/status" className='inline-flex items-center gap-1 rounded text-13 text-primary-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'>
              ติดตามทั้งหมด <ArrowRight className="inline-block size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[560px] table-fixed border-collapse text-left text-13'>
              <thead className='bg-surface text-12 text-ink-soft'>
                <tr>
                  <th scope='col' className='w-[26%] px-3 py-3 font-medium'>เลขที่คำขอ</th>
                  <th scope='col' className='w-[34%] px-3 py-3 font-medium'>ประเภท / วันที่ยื่น</th>
                  <th scope='col' className='w-[16%] px-3 py-3 font-medium'>จำนวนเงิน (บาท)</th>
                  <th scope='col' className='w-[24%] px-3 py-3 font-medium'>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((claim) => (
                  <tr key={claim.id} className='h-16 border-b border-slate-100'>
                    <th scope='row' className='px-3 py-2 font-semibold'>{claim.claimNo}</th>
                    <td className='px-3 py-2'>
                      <div className='font-medium'>{claim.benefitName}</div>
                      <div className='mt-1 text-12 text-gray-500'>{thaiDate(claim.submittedAt ?? claim.createdAt)}</div>
                    </td>
                    <td className='px-3 py-2 font-semibold'>{number.format(claim.amountRequested)}</td>
                    <td className='px-3 py-2'>
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-12 ${APPROVED.includes(claim.status) ? 'border-primary-100 bg-primary-50 text-primary-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        {STATUS_TEXT[claim.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr><td colSpan={4} className='px-3 py-8 text-center text-muted'>ยังไม่มีคำขอ</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className='rounded-lg border border-line bg-white p-5' aria-labelledby='announcements-title'>
          <h2 id='announcements-title' className='mb-4 text-17 font-semibold'>ประกาศสวัสดิการ</h2>
          <article className='border-b border-line py-4 first:pt-0'>
            <h3 className='mb-1 font-semibold leading-6 text-ink'>กำหนดส่งคำขอรอบเดือนตุลาคม</h3>
            <p className='text-13 leading-6 text-ink-soft'>ส่งคำขอพร้อมเอกสารภายใน 25 ต.ค. 2569 เพื่อรับการพิจารณาในรอบนี้</p>
            <p className='mt-2 text-12 text-muted'>8 ต.ค. 2569</p>
          </article>
          <article className='pt-4'>
            <h3 className='mb-1 font-semibold leading-6 text-ink'>เตรียมเอกสารก่อนยื่นคำขอ</h3>
            <p className='text-13 leading-6 text-ink-soft'>ใบเสร็จต้องระบุชื่อพนักงาน วันที่ และยอดที่ชำระอย่างชัดเจน</p>
            <p className='mt-2 text-12 text-muted'>1 ต.ค. 2569</p>
          </article>
        </section>
      </div>
    </>
  );
}
