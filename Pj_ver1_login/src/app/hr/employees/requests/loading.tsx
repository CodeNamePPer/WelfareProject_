import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, PageHeader } from "@/features/hr/ui";

// โครงหน้าคำขอแก้ไขข้อมูล (H12) ระหว่างรอข้อมูล
export default function EmployeeEditRequestsLoading() {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 leading-[1.55] text-ink">
      <PageHeader title="คำขอแก้ไขข้อมูลพนักงาน" description="พนักงานขอแก้ข้อมูลส่วนตัว HR ตรวจก่อนบันทึกจริง" />
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-3.5 p-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-[8px]" />
          <Skeleton className="h-9 w-full rounded-[8px]" />
          <div className="flex gap-2">
            <Skeleton className="h-[38px] w-36 rounded-full" />
            <Skeleton className="h-[38px] w-28 rounded-full" />
          </div>
        </Card>
      ))}
    </SkeletonScreen>
  );
}
