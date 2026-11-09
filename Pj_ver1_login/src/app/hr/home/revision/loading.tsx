import { StatusListSkeleton } from "../../HrSkeletons";

export default function RevisionRequestsLoading() {
  return <StatusListSkeleton active="revision" title="คำขอที่รอพนักงานแก้ไข" noteLabel="สิ่งที่ต้องแก้ไข" actorLabel="ส่งกลับโดย" dateLabel="วันที่ส่งกลับ" />;
}
