import { Skeleton } from "@/components/Skeleton";
import { PersonRequestsSkeleton, type SkeletonColumn } from "../../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-28" /> },
  { label: "ชื่อพนักงานใหม่", cell: <Skeleton className="h-4 w-32" /> },
  { label: "แผนก", cell: <Skeleton className="h-4 w-20" /> },
  { label: "ตำแหน่ง", cell: <Skeleton className="h-4 w-24" /> },
  { label: "วันที่ยื่นคำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เอกสาร", cell: <Skeleton className="h-4 w-20" /> },
  { label: "สถานะ", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
  { label: "รายละเอียด", hideLabel: true, cell: <Skeleton className="h-8 w-24 rounded-md" /> },
];

export default function EmployeeRequestsLoading() {
  return (
    <PersonRequestsSkeleton
      parent={{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }}
      title="ติดตามคำขอเพิ่มพนักงาน"
      contentClassName=""
      filtersClassName="person-request-filters"
      filters={["ค้นหา", "แผนก:", "ตำแหน่ง:", "สถานะ:"]}
      tableClassName="person-requests-table employee-requests-table"
      columns={COLUMNS}
      showFooter
    />
  );
}
