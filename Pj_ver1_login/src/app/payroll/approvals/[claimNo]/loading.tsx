import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { FieldsCard, HeadSkeleton, LinesCard, PersonCardSkeleton } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้ารายละเอียดคำขอไปแสดงโครงตารางของ /payroll/approvals
export default function FinClaimDetailLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={1} />
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
            <PersonCardSkeleton />
            <Card className="flex flex-col gap-1.5 px-4 py-3.5 text-13">
              <p className="font-semibold">บัญชีรับเงิน</p>
              <Skeleton className="h-3.5 w-48" />
            </Card>
          </div>
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <FieldsCard title="ยอดเงิน" fields={3} />
            <LinesCard title="ใบเสร็จ">
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </LinesCard>
            <LinesCard lines={2} />
          </div>
        </div>
      </HrPage>
    </SkeletonScreen>
  );
}
