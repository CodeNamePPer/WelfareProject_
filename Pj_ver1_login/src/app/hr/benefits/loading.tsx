import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, PageHeader } from "@/features/hr/ui";

const COLS = "grid-cols-[64px_minmax(0,2fr)_minmax(0,1fr)_120px_120px_120px]";

// โครงหน้าจัดการสวัสดิการ (H03) ระหว่างรอข้อมูล
export default function BenefitsLoading() {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 leading-[1.55] text-ink">
      <PageHeader title="จัดการสวัสดิการ" description="ข้อมูลชุดเดียวกับที่พนักงานเห็น · สร้าง แก้ไข หรือปิดสวัสดิการต้องเสนอผ่านหัวหน้า HR ทุกครั้ง" />
      <Card>
        <div className="px-5 pt-3.5 pb-2">
          <Skeleton className="h-5 w-56" />
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between border-t border-[#F1F5F9] px-5 py-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </Card>
      <Card>
        <div className="flex gap-[18px] border-b border-line px-5 py-3.5">
          {["w-20", "w-24", "w-20"].map((width, index) => (
            <Skeleton key={index} className={`h-4 ${width}`} />
          ))}
        </div>
        <div className="overflow-hidden">
          <div className="min-w-[820px]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`grid ${COLS} items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3`}>
                <Skeleton className="h-12 w-16 rounded-[6px]" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </SkeletonScreen>
  );
}
