import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

// ต้องตรงกับ COLS ใน page.tsx
const COLS = "grid-cols-[180px_150px_130px_minmax(0,1fr)_120px]";

// มีไฟล์นี้เพื่อไม่ให้หน้ารอบจ่ายเงินไปแสดงโครงหน้าภาพรวมของ /employee
export default function PayRoundsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead crumbs={[{ label: "ภาพรวม", href: "/employee" }, { label: "รอบจ่ายเงิน" }]} title="รอบจ่ายเงิน" description="สวัสดิการจ่ายเดือนละ 2 รอบ ตามวันที่ยื่นคำขอ" />

      <Sheet className="flex flex-col gap-3 px-5 py-[18px]">
        <h2 className="text-16 font-semibold">ได้เงินตอนไหน</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5 rounded-lg border border-line px-3.5 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-96 max-w-full" />
      </Sheet>

      <Sheet className="flex flex-col gap-2 px-5 py-[18px]">
        <h2 className="mb-0.5 text-16 font-semibold">ขั้นตอนก่อนได้รับเงิน</h2>
        {["w-72", "w-96", "w-[420px]", "w-64"].map((width, index) => (
          <Skeleton key={index} className={`h-3.5 max-w-full ${width}`} />
        ))}
      </Sheet>

      <Sheet>
        <h2 className="px-5 pt-3.5 pb-2 text-16 font-semibold">ปฏิทินรอบจ่ายและคำขอของคุณ</h2>
        <div className="overflow-hidden">
          <div className="min-w-[860px]">
            <div className={`grid ${COLS} gap-3 bg-surface px-5 py-2.5 text-12 font-medium text-muted`}>
              <span>รอบ</span>
              <span>ช่วงวันที่ยื่น</span>
              <span>วันจ่าย</span>
              <span>คำขอของคุณในรอบนี้</span>
              <span>สถานะ</span>
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`grid ${COLS} items-center gap-3 border-t border-slate-100 px-5 py-3.5`}>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </Sheet>
    </SkeletonScreen>
  );
}
