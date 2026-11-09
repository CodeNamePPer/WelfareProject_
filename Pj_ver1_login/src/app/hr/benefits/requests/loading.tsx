import { Skeleton } from "@/components/Skeleton";
import { PersonRequestsSkeleton, SkeletonLines, type SkeletonColumn } from "../../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "ประเภท", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
  { label: "จำนวนเงิน (บาท)", cell: <Skeleton className="h-4 w-16" /> },
  { label: "รายละเอียด", cell: <Skeleton className="h-4 w-32 max-w-full" /> },
  { label: "ผู้ยื่นคำขอ", cell: <SkeletonLines main="w-28" meta="w-36" /> },
  { label: "วันที่ยื่นคำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เอกสาร", cell: <Skeleton className="h-4 w-20" /> },
  { label: "รายการ", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
  { label: "ดูรายละเอียด", hideLabel: true, cell: <Skeleton className="h-8 w-24 rounded-md" /> },
];

export default function BenefitRequestsLoading() {
  return (
    <PersonRequestsSkeleton
      parent={{ label: "จัดการสวัสดิการ", href: "/hr/benefits" }}
      title="ติดตามคำขอเพิ่มสวัสดิการ"
      contentClassName="benefit-requests-content"
      filtersClassName="benefit-request-filters"
      filters={["ค้นหา", "ประเภทสวัสดิการ:", "รายการ:"]}
      tableClassName="benefit-track-table"
      columns={COLUMNS}
      showFooter
    />
  );
}
