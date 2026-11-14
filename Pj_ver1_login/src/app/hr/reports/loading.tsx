import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

// โครงหน้ารายงาน (H06) ระหว่างรอข้อมูล
export default function ReportsLoading() {
  return (
    <SkeletonScreen className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">
      <PageHead title="รายงานและสถิติ">
        <Skeleton className="h-[38px] w-64 rounded-full" />
      </PageHead>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-[1_1_180px] flex-col gap-2 rounded-lg border border-line bg-white px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <Sheet className="flex flex-[999_1_520px] flex-col gap-3 px-5 py-[18px]">
          <h2 className="text-16 font-semibold">สัดส่วนยอดเบิกตามสวัสดิการ</h2>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </Sheet>
        <Sheet className="flex flex-[1_1_300px] flex-col gap-2.5 px-5 py-[18px]">
          <h2 className="text-16 font-semibold">คงค้างตามแผนก</h2>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-3.5 w-full" />
          ))}
        </Sheet>
      </div>
    </SkeletonScreen>
  );
}
