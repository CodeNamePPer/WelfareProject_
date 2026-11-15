import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { BenefitPreviewSkeleton, HeadSkeleton } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้ฟอร์มเสนอสวัสดิการไปแสดงโครงตารางของ /hr/benefits
// ชื่อหน้าเปลี่ยนตามโหมด (เสนอใหม่ / แก้ไข / ร่าง) จึงแสดงเป็นแท่ง
export default function ProposeLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={1} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white px-3.5 py-2.5">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-24 max-w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <Card className="flex min-w-0 flex-[999_1_580px] flex-col gap-5 p-5 sm:p-6">
            <h2 className="text-16 font-semibold text-ink">1. ข้อมูลพื้นฐานของสวัสดิการ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </span>
              ))}
              <span className="flex flex-col gap-1.5 sm:col-span-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-[120px] w-full rounded-lg" />
              </span>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </Card>
          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
            <BenefitPreviewSkeleton label="พรีวิว: การ์ดที่พนักงานเห็น" />
          </aside>
        </div>
      </HrPage>
    </SkeletonScreen>
  );
}
