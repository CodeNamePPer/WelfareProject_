import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { QueueFiltersSkeleton, SkeletonLines, SkeletonTable, type SkeletonColumn } from "../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "พนักงาน", cell: <SkeletonLines main="w-36" meta="w-48" /> },
  { label: "ฝ่าย / แผนก", cell: <SkeletonLines main="w-28" meta="w-20" /> },
  { label: "ตำแหน่ง", cell: <SkeletonLines main="w-28" meta="w-16" /> },
  { label: "หัวหน้า", cell: <SkeletonLines main="w-28" meta="w-16" /> },
  { label: "สถานะ", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
  { label: "เปิดโปรไฟล์", hideLabel: true, className: "queue-open", cell: null },
];

export default function EmployeesLoading() {
  return (
    <SkeletonScreen className="page-content queue-page">
      <header className="queue-heading queue-heading-actions">
        <div>
          <h1>รายชื่อพนักงาน</h1>
          <ul className="queue-summary">
            <li><Skeleton className="inline-block h-4 w-20 align-middle" /></li>
            <li><Skeleton className="inline-block h-4 w-24 align-middle" /></li>
          </ul>
        </div>
        <div className="queue-heading-buttons">
          <Link href="/hr/employees/approvals" className="queue-secondary-link">อนุมัติคำขอเพิ่มพนักงาน</Link>
          <Link href="/hr/employees/requests" className="queue-secondary-link">ติดตามคำขอเพิ่มพนักงาน</Link>
          <Link href="/hr/employees/add" className="queue-primary queue-primary-link">เพิ่มพนักงาน</Link>
        </div>
      </header>

      <section className="queue-sheet" aria-label="รายชื่อพนักงาน">
        <QueueFiltersSkeleton selects={["ฝ่าย / แผนก", "สถานะ", "ความครบของข้อมูล"]} />
        <div className="queue-table-scroll">
          <SkeletonTable className="queue-table" columns={COLUMNS} rows={10} />
        </div>
        <footer className="queue-footer queue-footer-paged">
          <Skeleton className="h-4 w-44" />
        </footer>
      </section>
    </SkeletonScreen>
  );
}
