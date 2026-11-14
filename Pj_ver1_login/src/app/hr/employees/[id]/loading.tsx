import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card } from "@/features/hr/ui";

// โครงโปรไฟล์พนักงาน (H09) ระหว่างรอข้อมูล
export default function EmployeeProfileLoading() {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 leading-[1.55] text-ink">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[1_1_280px] overflow-hidden">
          <div className="h-14 bg-[#E6EBF3]" />
          <div className="flex flex-col gap-2 px-[18px] pt-3 pb-4">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
            <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-24" />
              ))}
            </div>
          </div>
        </Card>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          {[5, 4].map((rows, card) => (
            <Card key={card}>
              <div className="px-5 pt-3.5 pb-2">
                <Skeleton className="h-5 w-44" />
              </div>
              {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] px-5 py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
