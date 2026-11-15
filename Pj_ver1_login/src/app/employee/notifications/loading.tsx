import { SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";
import { NoticeListSkeleton } from "@/features/hr/HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้าแจ้งเตือนไปแสดงโครงหน้าภาพรวมของ /employee
export default function EmployeeNotificationsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead title="แจ้งเตือน" description="ความเคลื่อนไหวของคำขอสวัสดิการของคุณ เรียงจากล่าสุด" />
      <Sheet className="overflow-hidden">
        <NoticeListSkeleton groups={[2, 4]} />
      </Sheet>
    </SkeletonScreen>
  );
}
