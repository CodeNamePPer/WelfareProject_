import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const CARDS = 6;
const TAB_WIDTHS = ["w-20", "w-24", "w-28", "w-24"];

export default function WelfareLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1280px] space-y-4 px-1 py-3 text-ink">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg md:max-w-[480px]" />

      <div className="flex flex-wrap gap-2">
        {TAB_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-9 rounded-lg ${width}`} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: CARDS }).map((_, index) => (
          <div key={index} className="flex flex-col rounded-lg border border-line bg-white p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-40" />
            <Skeleton className="mt-6 h-10 w-full" />
            <Skeleton className="mt-4 h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
