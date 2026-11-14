import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

const DEPARTMENTS = 4;
const MEMBERS = 4;

const Stem = () => <div aria-hidden="true" className="mx-auto h-6 w-0.5 bg-slate-200" />;

// โครงหน้าโครงสร้างองค์กร ตรงกับ OrganizationClient (การ์ดเลือกฝ่าย + ผังของฝ่ายที่เลือก)
export default function OrganizationLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead title="โครงสร้างองค์กร" description={<span aria-hidden="true" className="mt-1 inline-block animate-pulse rounded bg-mist align-middle h-3.5 w-80 max-w-full" />} />

      <Sheet className="flex flex-col gap-3 p-5">
        <h2 className="text-16 font-semibold">หน่วยงานระดับฝ่าย</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: DEPARTMENTS }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5 rounded-lg border border-line px-3.5 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet className="flex flex-col items-center px-5 py-7">
        <div className="mb-5 flex w-full items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-16 w-[230px] max-w-full rounded-lg" />
        <Stem />
        <div aria-hidden="true" className="h-0.5 w-[780px] max-w-full bg-slate-200" />
        <div className="flex flex-wrap justify-center gap-x-6">
          {Array.from({ length: MEMBERS }).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <Stem />
              <Skeleton className="h-16 w-[230px] max-w-full rounded-lg" />
            </div>
          ))}
        </div>
      </Sheet>
    </SkeletonScreen>
  );
}
