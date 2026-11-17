import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, TableSkeleton, TwoLines } from "@/features/hr/HrSkeletons";

// ต้องตรงกับ COLS ใน VisibilityClient
const COLS = "grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_280px]";

// โครงหน้าการแสดงสวัสดิการที่ใช้ไม่ได้ระหว่างรอข้อมูล
export default function VisibilityLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton
          title="การแสดงสวัสดิการที่ใช้ไม่ได้"
          description="หัวหน้า HR กำหนดว่าสวัสดิการที่ปิดอยู่ ไม่มีวงเงินปีนี้ หรือพนักงานไม่มีสิทธิ์ จะซ่อนหรือแสดงเป็นการ์ดสีเทา"
        />
        <Card>
          <TableSkeleton
            cols={COLS}
            minWidth="min-w-[780px]"
            rows={4}
            head={["สวัสดิการ", "เหตุที่ใช้ไม่ได้", "พนักงานเห็นเป็น"]}
            cells={[
              <TwoLines key="name" top="w-40" bottom="w-16" />,
              <Skeleton key="reason" className="h-3.5 w-48 max-w-full" />,
              <Skeleton key="toggle" className="h-9 w-[160px] justify-self-end rounded-full" />,
            ]}
          />
        </Card>
        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <Skeleton className="h-[66px] w-[220px] rounded-[8px]" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
