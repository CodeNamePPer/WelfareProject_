import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card as Sheet } from "@/features/hr/ui";

// โครงหน้าตรวจคำขอ (H02) ระหว่างรอข้อมูล
export default function ReviewLoading() {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 text-ink">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-[1_1_280px] flex-col gap-4">
          <Sheet className="overflow-hidden">
            <div className="h-14 bg-mist" />
            <div className="flex flex-col gap-2 px-[18px] pb-4">
              <Skeleton className="-mt-8 size-[70px] rounded-full border-[3px] border-white" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-32" />
              <div className="mt-2 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
            </div>
          </Sheet>
          <Sheet className="flex flex-col gap-2 px-4 py-3.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
          </Sheet>
        </div>
        <div className="flex flex-[999_1_560px] flex-col gap-4">
          <Sheet className="flex flex-col gap-3 p-5">
            <h2 className="text-16 font-semibold">รายละเอียดคำขอ</h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          </Sheet>
          <Sheet className="flex flex-col gap-3 p-5">
            <h2 className="text-16 font-semibold">เอกสารแนบ</h2>
            <Skeleton className="h-[320px] w-full rounded-lg" />
          </Sheet>
        </div>
      </div>
    </SkeletonScreen>
  );
}
