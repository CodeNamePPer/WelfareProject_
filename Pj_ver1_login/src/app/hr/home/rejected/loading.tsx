import { StatusListSkeleton } from "../../HrSkeletons";

export default function RejectedRequestsLoading() {
  return <StatusListSkeleton active="rejected" title="คำขอที่ปฏิเสธแล้ว" noteLabel="เหตุผลที่ปฏิเสธ" actorLabel="ปฏิเสธโดย" dateLabel="วันที่ปฏิเสธ" />;
}
