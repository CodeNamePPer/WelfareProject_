import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

const ROWS = 6;
const TAB_WIDTHS = ["w-20", "w-24", "w-24", "w-20", "w-24"];
// ต้องตรงกับ LIST_COLS ใน StatusClient
const LIST_COLS = "grid-cols-[150px_minmax(0,1.6fr)_minmax(0,1.2fr)_110px_130px_150px]";

// โครงหน้าติดตามสถานะ ตรงกับ StatusClient (หัวหน้า + แผ่นเดียวมีแท็บ ตัวกรอง และตาราง)
export default function StatusLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead title="ติดตามสถานะ" description={<span aria-hidden="true" className="mt-1 inline-block animate-pulse rounded bg-mist align-middle h-3.5 w-48" />}>
        <Skeleton className="h-[38px] w-28 rounded-full" />
      </PageHead>

      <Sheet>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5">
          <div className="flex flex-wrap gap-[18px] py-3.5">
            {TAB_WIDTHS.map((width, index) => (
              <Skeleton key={index} className={`h-4 ${width}`} />
            ))}
          </div>
          <div className="flex gap-2 py-2">
            <Skeleton className="h-9 w-60 max-w-full rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="min-w-[880px]">
            <div className={`grid ${LIST_COLS} items-center gap-3 bg-surface px-5 py-2.5 text-12 font-medium text-muted`}>
              <span>เลขคำขอ</span>
              <span>สวัสดิการ</span>
              <span>ประเภท</span>
              <span className="text-right">จำนวนเงิน</span>
              <span>วันที่ยื่น</span>
              <span>สถานะ</span>
            </div>
            {Array.from({ length: ROWS }).map((_, index) => (
              <div key={index} className={`grid ${LIST_COLS} items-center gap-3 border-t border-slate-100 px-5 py-3.5`}>
                <Skeleton className="h-4 w-24" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </SkeletonScreen>
  );
}
