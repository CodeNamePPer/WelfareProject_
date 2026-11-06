import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Region } from "@/features/dashboard/ui";

const SUMMARY_CARDS = 4;
const NOTIFICATION_ROWS = 3;
const ROLE_ROWS = 4;
const LOG_ROWS = 5;

// โครงหน้าภาพรวมระบบ (/admin) ระหว่างรอข้อมูล วางเป็นแผ่นเดียวแบบเดียวกับ DashboardPage
export default function AdminDashboardLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[24px]">
      <PageHeader title="ภาพรวมระบบ" description="ดูแลระบบและติดตามคิว HR ส่วนการอนุมัติคำขอเบิกเป็นงานของ HR" />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line xl:grid-cols-6">
        {/* ตัวเลขสรุป 2×2 */}
        <div className="min-w-0 bg-white xl:col-span-3">
          <div className="grid h-full grid-cols-1 gap-px bg-line sm:grid-cols-2">
            {Array.from({ length: SUMMARY_CARDS }).map((_, i) => (
              <div key={i} className="flex min-h-[132px] flex-col gap-[12px] bg-white p-[16px] sm:p-[20px]">
                <Skeleton className="h-3 w-24" />
                <div className="flex flex-1 flex-col justify-end gap-[8px]">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-[6px] w-full rounded-[3px]" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification */}
        <Region className="xl:col-span-3">
          <div className="flex items-start justify-between gap-[14px]">
            <div className="flex min-w-0 flex-col gap-[6px]">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="flex flex-col divide-y divide-line">
            {Array.from({ length: NOTIFICATION_ROWS }).map((_, i) => (
              <div key={i} className="flex items-center gap-[14px] py-[12px] first:pt-[4px] last:pb-0">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full max-w-[280px]" />
                </div>
                <Skeleton className="hidden h-8 w-20 shrink-0 rounded-[6px] sm:block" />
              </div>
            ))}
          </div>
        </Region>

        {/* Users ในระบบ */}
        <Region className="xl:col-span-2">
          <div className="flex items-start justify-between gap-[14px]">
            <div className="flex min-w-0 flex-col gap-[6px]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="flex flex-col gap-[14px]">
            <Skeleton className="h-[12px] w-full rounded-[6px]" />
            <div className="flex flex-col divide-y divide-line">
              {Array.from({ length: ROLE_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center gap-[10px] py-[12px] first:pt-[4px] last:pb-0">
                  <Skeleton className="size-[10px] shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </Region>

        {/* ประวัติการแก้ไข */}
        <Region className="xl:col-span-4">
          <div className="flex items-start justify-between gap-[14px]">
            <div className="flex flex-col gap-[6px]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
          {/* บรรทัดเดียวต่อรายการ แบบเดียวกับ ActivityLogPanel */}
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {Array.from({ length: LOG_ROWS }).map((_, i) => (
              <div key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-[12px] py-[12px] sm:grid-cols-[6.5rem_7rem_minmax(0,1fr)_auto]">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="hidden h-5 w-20 sm:block" />
                <Skeleton className="h-4 w-full max-w-[280px]" />
                <Skeleton className="hidden h-3 w-24 sm:block" />
              </div>
            ))}
          </div>
        </Region>

        {/* สถิติการขอเบิกรายบุคคล */}
        <div className="min-w-0 bg-white xl:col-span-6">
          <Region>
            <div className="flex flex-col gap-[12px] lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-[6px]">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="flex flex-col gap-[8px] sm:flex-row">
                <Skeleton className="h-[37px] w-full rounded-[6px] sm:w-[220px]" />
                <Skeleton className="h-[37px] w-full rounded-[6px] sm:w-[180px]" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-[8px] bg-white py-[14px] sm:px-[16px] sm:first:pl-0">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="grid items-start gap-[20px] lg:grid-cols-2 lg:gap-0">
              <div className="flex flex-col gap-[10px] lg:pr-[24px]">
                <Skeleton className="h-4 w-20" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-[10px] lg:border-l lg:border-line lg:pl-[24px]">
                <Skeleton className="h-4 w-32" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-[12px]">
                    <div className="flex flex-col gap-[6px]">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex flex-col items-end gap-[6px]">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-14 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Region>
        </div>
      </div>
    </SkeletonScreen>
  );
}
