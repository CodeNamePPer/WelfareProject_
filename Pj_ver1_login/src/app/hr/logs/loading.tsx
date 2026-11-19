import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, TableSkeleton, TabsSkeleton } from "@/features/hr/HrSkeletons";

// ต้องตรงกับ COLS ใน LogClient
const COLS = "grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,2.4fr)]";

// โครงหน้าประวัติการแก้ไขของ HR ระหว่างรอข้อมูล
export default function HrLogLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton title="ประวัติการแก้ไข" />
        <Card>
          <TabsSkeleton widths={["w-16", "w-24", "w-24", "w-20"]} />
          <div className="hidden md:block">
            <TableSkeleton
              cols={COLS}
              minWidth="min-w-[860px]"
              rows={8}
              head={["เวลา", "การกระทำ", "รายการ", "ก่อน → หลัง"]}
              cells={[
                <Skeleton key="at" className="h-3.5 w-20" />,
                <Skeleton key="action" className="h-4 w-32 max-w-full" />,
                <Skeleton key="item" className="h-3.5 w-36 max-w-full" />,
                <Skeleton key="detail" className="h-3.5 w-64 max-w-full" />,
              ]}
            />
          </div>
          <div className="md:hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1.5 border-t border-[#F1F5F9] px-4 py-3 first:border-t-0">
                <span className="flex justify-between gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </span>
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
            ))}
          </div>
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
