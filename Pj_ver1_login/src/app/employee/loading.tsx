import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const CLAIM_ROWS = 3;
const BENEFIT_CARDS = 4;

// โครงหน้าภาพรวมสวัสดิการระหว่างรอข้อมูล (sidebar มาจาก employee/layout อยู่แล้ว)
export default function EmployeeHomeLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="h-24 bg-mist" />
        <div className="flex items-end gap-4 px-6">
          <Skeleton className="-mt-[52px] size-[104px] shrink-0 rounded-full border-4 border-white" />
          <div className="flex flex-col gap-2 pb-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-line px-6 py-4">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white">
        <h2 className="px-5 pt-4 pb-2 text-16 font-semibold">คำขอของฉันและยอดจ่าย</h2>
        {Array.from({ length: CLAIM_ROWS }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <h2 className="px-5 pt-4 pb-2 text-16 font-semibold">สิทธิ์สวัสดิการของฉัน</h2>
        <div className="grid gap-3 px-5 pt-1 pb-5 md:grid-cols-2">
          {Array.from({ length: BENEFIT_CARDS }).map((_, index) => (
            <div key={index} className="flex items-center gap-3.5 rounded-lg border border-line px-3.5 py-3">
              <Skeleton className="size-16 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
