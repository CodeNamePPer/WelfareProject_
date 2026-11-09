import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const BENEFIT_CARDS = 3;
const STAT_LABELS = ["คำขอทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "ฉบับร่าง"];
const RECENT_ROWS = 3;

// โครงหน้าภาพรวมสวัสดิการระหว่างรอข้อมูล (sidebar มาจาก employee/layout อยู่แล้ว)
export default function EmployeeHomeLoading() {
  return (
    <SkeletonScreen>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-22 font-semibold tracking-tight text-ink">ภาพรวมสวัสดิการของฉัน</h1>
          <p className="text-13 text-muted">ตรวจสอบสิทธิ์สวัสดิการของคุณได้ที่นี่</p>
        </div>
        <Link href="/employee/withdraw" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-13 font-medium text-white transition-colors hover:bg-primary-700">
          ยื่นคำขอใหม่
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-medium text-ink">สิทธิ์คงเหลือของฉัน</h2>
        <Skeleton className="h-4 w-52" />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {Array.from({ length: BENEFIT_CARDS }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="mb-3 h-8 w-32" />
            <Skeleton className="mb-3 h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      <div className="my-2">
        <p className="text-13 text-muted">วงเงินคงเหลือหักทั้งรายการที่อนุมัติแล้วและรายการที่รอตรวจ</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_LABELS.map((label) => (
          <div key={label} className="flex min-h-[76px] items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-13 text-ink-soft">
            {label}
            <Skeleton className="h-7 w-8" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="min-w-0 rounded-lg border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-17 font-semibold">คำขอล่าสุด</h2>
          <div className="flex flex-col">
            {Array.from({ length: RECENT_ROWS }).map((_, index) => (
              <div key={index} className="grid h-16 grid-cols-[26%_34%_16%_24%] items-center border-b border-slate-100 px-3">
                <Skeleton className="h-4 w-24 max-w-[90%]" />
                <div className="flex flex-col gap-[6px]">
                  <Skeleton className="h-4 w-32 max-w-[90%]" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-6 w-24 max-w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-17 font-semibold">ประกาศสวัสดิการ</h2>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </section>
      </div>
    </SkeletonScreen>
  );
}
