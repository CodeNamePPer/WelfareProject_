import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, StatsSkeleton, TableSkeleton, TabsSkeleton, TwoLines } from "@/features/hr/HrSkeletons";

// ต้องตรงกับ COLS ใน ProposalQueueClient
const COLS = "grid-cols-[90px_minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_130px_120px]";

// โครงหน้าอนุมัติสวัสดิการใหม่ระหว่างรอข้อมูล
export default function ProposalQueueLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton title="อนุมัติสวัสดิการใหม่" description="ข้อเสนอจาก HR และ Admin รอหัวหน้า HR ตัดสินใจ อนุมัติแล้วจะเพิ่มเข้าตาราง welfare_benefit ทันที" />
        <StatsSkeleton count={3} />
        <Card>
          <TabsSkeleton widths={["w-20", "w-24", "w-24", "w-20"]} />
          <TableSkeleton
            cols={COLS}
            minWidth="min-w-[900px]"
            rows={4}
            cells={[
              <Skeleton key="image" className="h-14 w-[90px] rounded-[6px]" />,
              <TwoLines key="name" top="w-44" bottom="w-32" />,
              <span key="by" className="flex items-center gap-2">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <TwoLines top="w-28" bottom="w-16" />
              </span>,
              <Skeleton key="limit" className="h-3.5 w-24" />,
              <Skeleton key="status" className="h-5 w-20 rounded-full" />,
              <Skeleton key="action" className="ml-auto h-8 w-24 rounded-full" />,
            ]}
          />
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
