import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, StatsSkeleton, TwoLines } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้ารายการในรอบไปแสดงโครงรายการรอบของ /payroll/history (ตรงกับ PayoutTable แบบอ่านอย่างเดียว)
export default function HistoryRoundLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={1} />
        <StatsSkeleton count={3} />
        <Card>
          <div className="h-8 rounded-t-[8px] bg-[#F8FAFC]" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-t border-[#F1F5F9] px-5 py-3">
              <span className="min-w-0 flex-[2_1_0]">
                <TwoLines avatar top="w-32" bottom="w-24" />
              </span>
              <Skeleton className="hidden h-3.5 w-24 sm:block" />
              <Skeleton className="hidden h-3.5 w-40 md:block" />
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
