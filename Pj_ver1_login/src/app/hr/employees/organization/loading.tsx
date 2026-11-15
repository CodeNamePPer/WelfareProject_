import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage, PageHeader } from "@/features/hr/ui";

// มีไฟล์นี้เพื่อไม่ให้ผังองค์กรไปแสดงโครงตารางของ /hr/employees
function PersonBox() {
  return (
    <div className="flex w-[220px] max-w-full items-center gap-2.5 rounded-[8px] border border-line bg-white px-3 py-2.5">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </span>
    </div>
  );
}

export default function OrgChartLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <PageHeader
          crumbs={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "โครงสร้างองค์กร" }]}
          title="โครงสร้างองค์กร"
          description="ใครเป็นหัวหน้าแผนก ใครอยู่ฝ่ายไหน · หัวหน้า 1 คนดูแลได้หลายคน (1:N)"
        />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-full rounded-lg sm:w-[240px]" />
        </div>
        <Card className="overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col items-center">
            <PersonBox />
            <div className="h-5 w-0.5 bg-[#CBD5E1]" />
            <div className="h-0.5 w-[760px] max-w-full bg-[#CBD5E1]" />
            <div className="flex w-[760px] max-w-full justify-around gap-4 pt-5">
              {Array.from({ length: 3 }).map((_, column) => (
                <div key={column} className="flex flex-col items-center gap-2">
                  <PersonBox />
                  <PersonBox />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
