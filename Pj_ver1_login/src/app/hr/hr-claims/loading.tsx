import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, TableSkeleton, TwoLines } from "@/features/hr/HrSkeletons";

// ต้องตรงกับ COLS ใน page.tsx
const COLS = "grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_150px_130px]";

// โครงหน้าคำขอเบิกของ HR ระหว่างรอข้อมูล
export default function HrClaimsLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton title="คำขอเบิกของ HR" description="คำขอของ HR ต้องให้หัวหน้า HR ตรวจ" />
        <Card>
          <div className="hidden md:block">
            <TableSkeleton
              cols={COLS}
              minWidth="min-w-[900px]"
              head={["ผู้ขอ", "คำขอ", <span key="amount" className="block text-right">จำนวนเงิน</span>, "สถานะ", ""]}
              cells={[
                <TwoLines key="person" avatar top="w-32" bottom="w-44" />,
                <TwoLines key="claim" top="w-36" bottom="w-40" />,
                <Skeleton key="amount" className="ml-auto h-4 w-16" />,
                <Skeleton key="status" className="h-5 w-28 rounded-full" />,
                <Skeleton key="action" className="ml-auto h-8 w-24 rounded-full" />,
              ]}
            />
          </div>
          <div className="md:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2.5 border-t border-[#F1F5F9] px-4 py-3.5 first:border-t-0">
                <TwoLines avatar top="w-32" bottom="w-44" />
                <TwoLines top="w-36" bottom="w-40" />
                <Skeleton className="h-8 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
