import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const CARDS = 6;
const TAB_WIDTHS = ["w-20", "w-24", "w-28", "w-24"];

export default function WelfareLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1280px] space-y-4 px-1 py-3 text-ink">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-[42px] w-full md:max-w-[760px]" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TAB_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-9 rounded-lg ${width}`} />
        ))}
      </div>

      <Skeleton className="h-4 w-40" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: CARDS }).map((_, index) => (
          <div key={index} className="flex h-full flex-col rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="mt-4 h-[68px] w-full rounded-xl" />
            <Skeleton className="mt-4 h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
