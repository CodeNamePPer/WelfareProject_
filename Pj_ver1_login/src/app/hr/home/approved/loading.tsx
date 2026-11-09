import { StatusListSkeleton } from "../../HrSkeletons";

export default function ApprovedRequestsLoading() {
  return <StatusListSkeleton active="approved" title="คำขอที่อนุมัติแล้ว" actorLabel="อนุมัติโดย" dateLabel="วันที่อนุมัติ" />;
}
