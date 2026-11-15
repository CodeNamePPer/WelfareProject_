import { SkeletonScreen } from "@/components/Skeleton";
import { HrPage } from "@/features/hr/ui";
import { BenefitPreviewSkeleton, FieldsCard, HeadSkeleton, LinesCard } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้ารายละเอียดไปแสดงโครงตารางของ /hr/benefits
export default function BenefitDetailLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={2} />
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <FieldsCard title="เงื่อนไขและวงเงินการเบิก" fields={6} />
            <LinesCard title="เอกสารที่พนักงานต้องแนบ" lines={3} />
          </div>
          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
            <BenefitPreviewSkeleton label="พรีวิว: การ์ดที่พนักงานเห็น" />
          </aside>
        </div>
      </HrPage>
    </SkeletonScreen>
  );
}
