import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

const ROWS_PER_SECTION = [3, 4, 6, 4];

// โครงหน้าโปรไฟล์ระหว่างรอโหลด
export default function AdminProfileLoading() {
  return (
    <SkeletonScreen className="mx-auto flex w-full max-w-[960px] flex-col gap-[20px]">
      <PageHeader title="โปรไฟล์ของฉัน" description="ข้อมูลของบัญชีที่เข้าระบบอยู่" />

      <div className="overflow-hidden rounded-[10px] border border-line bg-white">
        <div className="flex items-center gap-[16px] p-[20px]">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex flex-col gap-[8px]">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-px border-t border-line bg-line lg:grid-cols-2">
          {ROWS_PER_SECTION.map((count, i) => (
            <div key={i} className="flex flex-col gap-[12px] bg-white p-[20px]">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: count }).map((_, j) => (
                <div key={j} className="flex gap-[16px]">
                  <Skeleton className="h-4 w-[8.5rem]" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
