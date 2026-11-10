import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

export default function WelfareDetailLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1080px] space-y-3 px-1 py-3">
      <Skeleton className="h-4 w-56" />
      <div className="rounded-lg border border-line bg-white">
        <div className="space-y-2 border-b border-line p-4 sm:p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="space-y-3 border-t border-line p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
