import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

const ROWS = 6;
const COLS = "grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_140px_110px_120px]";

// โครงหน้าจัดการพนักงาน (H05) ระหว่างรอข้อมูล
export default function EmployeesLoading() {
  return (
    <SkeletonScreen className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">
      <PageHead title="จัดการพนักงานและสิทธิ์">
        <Skeleton className="h-[38px] w-28 rounded-full" />
      </PageHead>
      <Sheet>
        <div className="flex gap-[18px] border-b border-line px-5 py-3.5">
          {["w-24", "w-20", "w-28"].map((width, index) => (
            <Skeleton key={index}className={`h-4 ${width}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <Skeleton className="h-9 w-[260px] max-w-full rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="overflow-hidden">
          <div className="min-w-[860px]">
            <div className={`grid ${COLS} gap-3.5 bg-surface px-5 py-2 text-12 font-medium text-muted`}>
              <span>พนักงาน</span>
              <span>ระดับ / หัวหน้า</span>
              <span>เบิกปีนี้</span>
              <span>สถานะ</span>
              <span />
            </div>
            {Array.from({ length: ROWS }).map((_, index) => (
              <div key={index} className={`grid ${COLS} items-center gap-3.5 border-t border-slate-100 px-5 py-3`}>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </SkeletonScreen>
  );
}
