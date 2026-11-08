'use client';
import { ArrowRight } from "lucide-react";
import Link from "next/link";
export default function Home() {
  const requests = [
    {
      id: 'WF-2569-014',
      type: 'ค่ารักษาพยาบาล',
      date: '12 ต.ค. 2569',
      amount: '1,000',
      status: 'กำลังตรวจสอบ',
      budget: '10,000',
      remaining: '7,500',
    },
    {
      id: 'WF-2569-011',
      type: 'ค่าทันตกรรม',
      date: '20 ก.ย. 2569',
      amount: '1,200',
      status: 'อนุมัติแล้ว',
      budget: '3,000',
      remaining: '1,800',
    },
    {
      id: 'WF-2569-006',
      type: 'ค่ารักษาพยาบาล',
      date: '15 มิ.ย. 2569',
      amount: '1,500',
      status: 'อนุมัติแล้ว',
      budget: '10,000',
      remaining: '8,500',
    },
  ];

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
          <span className='text-muted'>1 ม.ค. – 31 ธ.ค. 2569</span>
          <Link href="/employee/welfare" className='inline-flex shrink-0 items-center gap-1 text-primary-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'>
            ดูสิทธิ์ทั้งหมด <ArrowRight className="inline-block size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-13 lg:grid-cols-3">
        <article className='rounded-lg border border-line bg-white p-5 transition-colors hover:border-primary-100'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <p className='text-14 font-semibold text-ink'>ค่ารักษาพยาบาล</p>
            <span className='rounded-full bg-primary-50 px-2.5 py-1 text-12 font-medium text-primary-700'>ประจำปี</span>
          </div>
          <div className='mb-3 flex items-end gap-2'>
            <span className='text-24 font-semibold tabular-nums text-ink'>7,500</span>
            <span className='pb-1 text-12 text-muted'>บาทคงเหลือ</span>
          </div>
          <div className='mb-3 h-2 w-full overflow-hidden rounded-full bg-primary-50' role='progressbar' aria-label='วงเงินค่ารักษาพยาบาลคงเหลือ' aria-valuemin={0} aria-valuemax={10000} aria-valuenow={7500}>
            <div className='h-full w-[75%] rounded-full bg-primary-600'></div>
          </div>
          <div className='flex items-center justify-between text-12 text-muted'>
            <span>ใช้แล้ว</span>
            <span className='font-medium tabular-nums text-ink-soft'>2,500 / 10,000 บาท</span>
          </div>
        </article>

        <article className='rounded-lg border border-line bg-white p-5 transition-colors hover:border-primary-100'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <p className='text-14 font-semibold text-ink'>ค่าทันตกรรม</p>
            <span className='rounded-full bg-primary-50 px-2.5 py-1 text-12 font-medium text-ink-soft'>ประจำปี</span>
          </div>
          <div className='mb-3 flex items-end gap-2'>
            <span className='text-24 font-semibold tabular-nums text-ink'>1,800</span>
            <span className='pb-1 text-12 text-muted'>บาทคงเหลือ</span>
          </div>
          <div className='mb-3 h-2 w-full overflow-hidden rounded-full bg-primary-50' role='progressbar' aria-label='วงเงินค่าทันตกรรมคงเหลือ' aria-valuemin={0} aria-valuemax={3000} aria-valuenow={1800}>
            <div className='h-full w-[60%] rounded-full bg-primary-600'></div>
          </div>
          <div className='flex items-center justify-between text-12 text-muted'>
            <span>ใช้แล้ว</span>
            <span className='font-medium tabular-nums text-ink-soft'>1,200 / 3,000 บาท</span>
          </div>
        </article>

        <article className='rounded-lg border border-line bg-white p-5 transition-colors hover:border-primary-100'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <p className='text-14 font-semibold text-ink'>ค่าอบรมและพัฒนา</p>
            <span className='rounded-full bg-primary-50 px-2.5 py-1 text-12 font-medium text-ink-soft'>ถึงสิทธิ์</span>
          </div>
          <div className='mb-3 flex items-end gap-2'>
            <span className='text-24 font-semibold tabular-nums text-ink'>5,000</span>
            <span className='pb-1 text-12 text-muted'>บาทคงเหลือ</span>
          </div>
          <div className='mb-3 h-2 w-full overflow-hidden rounded-full bg-primary-50' role='progressbar' aria-label='วงเงินค่าอบรมและพัฒนาคงเหลือ' aria-valuemin={0} aria-valuemax={5000} aria-valuenow={5000}>
            <div className='h-full w-full rounded-full bg-primary-600'></div>
          </div>
          <div className='flex items-center justify-between text-12 text-muted'>
            <span>ใช้แล้ว</span>
            <span className='font-medium tabular-nums text-ink-soft'>5,000 / 5,000 บาท</span>
          </div>
        </article>
      </div>
      <div className='my-2'>
        <p className='text-13 text-muted'>วงเงินคงเหลือหักเฉพาะรายการที่อนุมัติแล้ว</p>
      </div>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>คำขอทั้งหมด <span className='text-22 font-semibold tabular-nums text-ink'>4</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>รออนุมัติ <span className='text-22 font-semibold tabular-nums text-ink'>2</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>อนุมัติแล้ว <span className='text-22 font-semibold tabular-nums text-ink'>1</span></div>
        <div className='flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft'>ฉบับร่าง <span className='text-22 font-semibold tabular-nums text-ink'>1</span></div>
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
            <table className='w-full min-w-[680px] table-fixed border-collapse text-left text-13'>
              <thead className='bg-surface text-12 text-ink-soft'>
                <tr>
                  <th scope='col' className='w-[18%] px-3 py-3 font-medium'>เลขที่คำขอ</th>
                  <th scope='col' className='w-[24%] px-3 py-3 font-medium'>ประเภท / วันที่ยื่น</th>
                  <th scope='col' className='w-[15%] px-3 py-3 font-medium'>จำนวนเงิน (บาท)</th>
                  <th scope='col' className='w-[23%] px-3 py-3 font-medium'>สถานะ / ความคืบหน้า</th>
                  <th scope='col' className='w-[20%] px-3 py-3 font-medium'>เงินต้นคงเหลือ (บาท)</th>
                </tr>
              </thead>
              {requests.map((request) => (
                <tbody key={request.id}>
                  <tr className='h-16 border-b border-slate-100'>
                    <th scope='row' className='px-3 py-2 font-semibold'>{request.id}</th>
                    <td className='px-3 py-2'>
                      <div className='font-medium'>{request.type}</div>
                      <div className='mt-1 text-12 text-gray-500'>{request.date}</div>
                    </td>
                    <td className='px-3 py-2 font-semibold'>{request.amount}</td>
                    <td className='px-3 py-2'>
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-12 ${request.status === 'กำลังตรวจสอบ' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-primary-100 bg-primary-50 text-primary-700'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className='px-3 py-2'>
                      <div className='font-semibold'>{request.budget} เงินต้น</div>
                      <div className='mt-1 text-12 text-gray-500'>{request.remaining} เงินคงเหลือ</div>
                    </td>
                  </tr>
                  <tr className='border-b border-line bg-surface/70'>
                    <td colSpan={5} className='px-3 py-2 text-12 text-muted'>
                      ผู้ดูแลคำขอ: [ชื่อผู้ดูแล] · ฝ่ายบุคคล
                    </td>
                  </tr>
                </tbody>
              ))}
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
  )
}
