import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const LOCKED_FIELDS = 5;

// โครงหน้าโปรไฟล์ระหว่างรอข้อมูล
export default function ProfileLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="h-24 bg-mist" />
        <div className="flex items-end gap-4 px-6 pb-4">
          <Skeleton className="-mt-[52px] size-[104px] shrink-0 rounded-full border-4 border-white" />
          <div className="flex flex-col gap-2 pb-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3.5 text-16 font-semibold">ข้อมูลที่ระบบกำหนด</h2>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: LOCKED_FIELDS }).map((_, index) => (
            <Skeleton key={index} className="h-[42px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
