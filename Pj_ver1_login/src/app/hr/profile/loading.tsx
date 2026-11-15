import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { FieldsCard } from "@/features/hr/HrSkeletons";

// โครงหน้าโปรไฟล์ HR ระหว่างรอข้อมูล (หัวโปรไฟล์ + แท็บ + แท็บแรก)
export default function HrProfileLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <Card className="overflow-hidden">
          <div className="h-24 bg-[#1E3A8A]" />
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4 sm:px-6">
            <div className="flex min-w-0 flex-wrap items-end gap-4">
              <Skeleton className="-mt-[52px] size-[104px] shrink-0 rounded-full border-4 border-white" />
              <div className="flex flex-col gap-2 pb-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3 w-40" />
                <div className="mt-0.5 flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
          <div className="flex gap-5 overflow-hidden border-t border-line px-6 py-3.5">
            {["w-24", "w-20", "w-24", "w-20", "w-24"].map((width, index) => (
              <Skeleton key={index} className={`h-4 shrink-0 ${width}`} />
            ))}
          </div>
        </Card>
        <FieldsCard title="ข้อมูลที่ระบบกำหนด" fields={6} cols="sm:grid-cols-2 lg:grid-cols-3" />
        <FieldsCard title="ข้อมูลติดต่อ" fields={4} cols="sm:grid-cols-2 lg:grid-cols-3" />
        <FieldsCard title="การทำงาน" fields={3} cols="sm:grid-cols-2 lg:grid-cols-3" />
      </HrPage>
    </SkeletonScreen>
  );
}
