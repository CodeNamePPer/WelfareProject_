import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

const ACTION_ROWS = 2;
const FEED_ROWS = 5;

// โครงหน้าการแจ้งเตือนระหว่างรอโหลด
export default function AdminNotificationsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[20px]">
      <PageHeader
        title="การแจ้งเตือน"
        action={
          <div className="flex items-center gap-[8px]">
            <Skeleton className="h-[40px] w-[120px] rounded-[6px] sm:h-[34px]" />
            <Skeleton className="h-[40px] w-[150px] rounded-[6px] sm:h-[34px]" />
          </div>
        }
      />

      <div className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-white">
      {/* สรุปตัวเลข 3 ช่อง */}
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-start gap-[6px] px-[12px] py-[12px] sm:px-[18px] sm:py-[14px]">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-3 w-20 sm:w-28" />
          </div>
        ))}
      </div>

      {/* ตัวกรอง + ค้นหา */}
      <div className="flex flex-col gap-[12px] border-b border-line p-[16px]">
        <div className="flex gap-[8px] overflow-x-auto">
          <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
        </div>
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <Skeleton className="h-10 w-full flex-1 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-[160px]" />
        </div>
      </div>

      {/* ต้องดำเนินการ */}
      <section className="border-b border-line">
        <header className="flex items-center gap-[8px] border-b border-primary-100 bg-primary-50 px-[16px] py-[10px]">
          <h2 className="text-14 font-semibold text-primary-700">ต้องดำเนินการ</h2>
          <Skeleton className="h-5 w-6 rounded-full" />
        </header>
        <div className="divide-y divide-line">
          {Array.from({ length: ACTION_ROWS }).map((_, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] px-[16px] py-[14px] sm:flex-nowrap">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex min-w-[calc(100%-54px)] flex-1 flex-col gap-[6px] sm:min-w-0">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full max-w-[320px]" />
              </div>
              <Skeleton className="ml-[54px] h-9 w-24 shrink-0 rounded-[6px] sm:ml-0" />
            </div>
          ))}
        </div>
      </section>

      {/* รายการแจ้งเตือนทั้งหมด */}
      <section>
        <div className="border-b border-line bg-surface px-[16px] py-[8px]">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: FEED_ROWS }).map((_, i) => (
            <div key={i} className="flex items-center gap-[12px] px-[16px] py-[12px]">
              <span className="w-[8px] shrink-0" aria-hidden="true" />
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full max-w-[360px]" />
              </div>
              <Skeleton className="hidden h-3 w-16 shrink-0 sm:block" />
              <Skeleton className="size-[30px] shrink-0 rounded-[6px]" />
            </div>
          ))}
        </div>
      </section>
      </div>
    </SkeletonScreen>
  );
}
