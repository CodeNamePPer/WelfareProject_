import { SkeletonScreen } from "@/components/Skeleton";
import { Card, HrPage } from "@/features/hr/ui";
import { HeadSkeleton, NoticeListSkeleton } from "@/features/hr/HrSkeletons";

// โครงหน้าแจ้งเตือนของ Admin ระหว่างรอข้อมูล
export default function AdminNotificationsLoading() {
  return (
    <SkeletonScreen>
      <HrPage>
        <HeadSkeleton title="แจ้งเตือน" actions={1} />
        <Card className="overflow-hidden">
          <NoticeListSkeleton groups={[2, 4]} />
        </Card>
      </HrPage>
    </SkeletonScreen>
  );
}
