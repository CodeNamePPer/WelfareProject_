import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const ROWS = 6;
const TABS = ["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "ดำเนินการ", "ไม่อนุมัติ"];

export default function StatusLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1500px] space-y-3 px-1 pb-8 text-13 text-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-22 font-semibold">ติดตามคำขอสวัสดิการ</h1>
          <p className="mt-1 text-12 text-muted">ตรวจสอบรายการคำขอและดูขั้นตอนการอนุมัติของคุณ</p>
        </div>
        <Link href="/employee/withdraw" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-13 font-medium text-white transition-colors hover:bg-primary-700">
          ยื่นคำขอใหม่
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 min-w-0 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <span key={tab} className="shrink-0 rounded border border-line bg-white px-3 py-1.5 text-12 text-ink-soft">{tab}</span>
        ))}
      </div>

      <section className="rounded border border-line bg-white p-3">
        <h2 className="mb-3 font-semibold">คำขอของฉัน</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-12">
            <thead>
              <tr className="bg-primary-50 text-ink-soft">
                <th className="px-3 py-2 font-medium">เลขที่คำขอ</th>
                <th className="px-3 py-2 font-medium">ประเภท / วันที่ยื่น</th>
                <th className="px-3 py-2 text-right font-medium">จำนวนเงิน (บาท)</th>
                <th className="px-3 py-2 font-medium">สถานะ</th>
                <th className="px-3 py-2 font-medium">ขั้นตอนล่าสุด</th>
                <th className="px-3 py-2 text-right font-medium">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }).map((_, index) => (
                <tr key={index} className="border-b border-line">
                  <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1.5 h-3 w-20" />
                  </td>
                  <td className="px-3 py-3"><Skeleton className="ml-auto h-4 w-14" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-6 w-20" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-3"><Skeleton className="ml-auto h-6 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between pt-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
      </section>
    </SkeletonScreen>
  );
}
