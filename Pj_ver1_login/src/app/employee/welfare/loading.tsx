import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead } from "@/features/requester/ui";

const CARDS = 6;
const CHIP_WIDTHS = ["w-20", "w-24", "w-28", "w-24"];

// โครงหน้าสิทธิ์สวัสดิการ ตรงกับ WelfareClient (ชิปหมวด + ช่องค้นหา + การ์ดมีภาพหัว)
export default function WelfareLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead title="สิทธิ์สวัสดิการ" description={<span aria-hidden="true" className="mt-1 inline-block animate-pulse rounded bg-mist align-middle h-3.5 w-56" />} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CHIP_WIDTHS.map((width, index) => (
            <Skeleton key={index} className={`h-8 rounded-full ${width}`} />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-lg sm:w-[260px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: CARDS }).map((_, index) => (
          <div key={index} className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
            <div className="h-[140px] bg-mist" />
            <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="h-3.5 w-full" />
              <div className="mt-1.5 flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-sm" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-1.5 h-[38px] w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
