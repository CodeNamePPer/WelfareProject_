import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { BenefitPreviewSkeleton, FieldsCard, HeadSkeleton, LinesCard, StatsSkeleton } from "@/features/hr/HrSkeletons";

// โครงหน้าตรวจข้อเสนอสวัสดิการ (หัวหน้า HR) ระหว่างรอข้อมูล
export default function ProposalReviewLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={1} />
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <FieldsCard title="รายละเอียดที่เสนอ" fields={9} />
            <Card className="flex flex-col gap-2.5 p-5">
              <h2 className="text-16 font-semibold">ผลกระทบงบประมาณโดยประมาณ</h2>
              <StatsSkeleton count={2} />
            </Card>
            <LinesCard title="การตัดสินใจ" lines={2} />
          </div>
          <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
            <BenefitPreviewSkeleton label="พนักงานจะเห็นแบบนี้" />
            <Card className="flex items-center gap-2.5 px-4 py-3.5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <span className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </span>
            </Card>
          </aside>
        </div>
      </HrPage>
    </SkeletonScreen>
  );
}
