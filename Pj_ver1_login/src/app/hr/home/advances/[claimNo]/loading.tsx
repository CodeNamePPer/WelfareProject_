import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { HrPage } from "@/features/hr/ui";
import { HeadSkeleton, LinesCard, PersonCardSkeleton } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้าตรวจใบเสร็จไปแสดงโครงคิวคำขอของ /hr/home
export default function ReceiptReviewLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs />
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-[1_1_280px]">
            <PersonCardSkeleton />
          </div>
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <LinesCard title="สรุปยอด">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="flex justify-between gap-3">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-20" />
                </span>
              ))}
            </LinesCard>
            <LinesCard title="ใบเสร็จและเอกสารแนบ">
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </LinesCard>
            <LinesCard lines={2} />
          </div>
        </div>
      </HrPage>
    </SkeletonScreen>
  );
}
