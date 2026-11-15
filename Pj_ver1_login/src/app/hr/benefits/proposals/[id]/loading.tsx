import { SkeletonScreen } from "@/components/Skeleton";
import { HrPage } from "@/features/hr/ui";
import { FieldsCard, HeadSkeleton } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้าข้อเสนอของฉันไปแสดงโครงตารางของ /hr/benefits
export default function MyProposalLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton crumbs actions={1} />
        <FieldsCard title="รายละเอียดที่เสนอ" fields={9} />
      </HrPage>
    </SkeletonScreen>
  );
}
