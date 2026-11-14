import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, PageHeader } from "@/features/hr/ui";

const ROWS = 5;
const COLS = "grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_120px_130px]";

// โครงคิวคำขอระหว่างรอข้อมูล (ตรงกับ HrQueueClient)
export default function HrQueueLoading() {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 leading-[1.55] text-ink">
      <PageHeader title="คิวคำขอสวัสดิการ" description="คำขอที่ส่งถึงคุณ" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex min-w-0 flex-[1_1_160px] flex-col gap-2 rounded-[8px] border border-line bg-white px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <Card>
        <div className="flex gap-[18px] overflow-hidden border-b border-line px-5 py-3.5">
          {["w-20", "w-28", "w-24", "w-20", "w-16"].map((width, index) => (
            <Skeleton key={index} className={`h-4 shrink-0 ${width}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <Skeleton className="h-9 w-full rounded-lg sm:w-[280px]" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="hidden md:block">
          <div className={`grid ${COLS} gap-3.5 bg-surface px-5 py-2 text-12 font-medium text-muted`}>
            <span>ผู้ขอ</span>
            <span>คำขอ</span>
            <span className="text-right">จำนวนเงิน</span>
            <span>สถานะ</span>
            <span />
          </div>
          {Array.from({ length: ROWS }).map((_, index) => (
            <div key={index} className={`grid ${COLS} items-center gap-3.5 border-t border-slate-100 px-5 py-3.5`}>
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="ml-auto h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
        <div className="md:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2.5 border-t border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </SkeletonScreen>
  );
}
