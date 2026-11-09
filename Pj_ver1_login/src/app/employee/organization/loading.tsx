import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const DEPARTMENTS = 4;
const EMPLOYEE_ROWS = 5;

export default function OrganizationLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1500px] space-y-4 px-1 pb-8 text-13 text-ink">
      <div>
        <h1 className="text-22 font-semibold">โครงสร้างองค์กร</h1>
        <Skeleton className="mt-[8px] h-3 w-80 max-w-full" />
      </div>

      <Skeleton className="h-[66px] w-full" />

      <section className="rounded border border-line bg-white p-4">
        <h2 className="font-semibold">โครงสร้างระดับฝ่าย</h2>
        <div className="mx-auto mt-4 max-w-xs rounded border border-line bg-surface px-4 py-3 text-center">
          <p className="text-12 font-semibold">องค์กร</p>
          <p className="mt-1 text-11 text-muted">หน่วยงานระดับฝ่าย</p>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: DEPARTMENTS }).map((_, index) => (
            <Skeleton key={index} className="h-[112px] w-full" />
          ))}
        </div>
      </section>

      <section className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="mt-3 h-[58px] w-full" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: EMPLOYEE_ROWS }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 border-b border-line px-3 py-2.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-4 w-28" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
