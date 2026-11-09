import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { QueueFiltersSkeleton, SkeletonLines, SkeletonTable, StatusTabsSkeleton, type SkeletonColumn } from "../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "เลือก", hideLabel: true, className: "queue-check", cell: null },
  { label: "เลขที่คำขอ", cell: <SkeletonLines main="w-28" meta="w-36" /> },
  { label: "พนักงาน", cell: <SkeletonLines main="w-32" meta="w-40" /> },
  { label: "ยอดเบิก", className: "queue-num", cell: <SkeletonLines main="w-20" meta="w-32" end /> },
  { label: "ยื่นเมื่อ", cell: <SkeletonLines main="w-24" meta="w-16" /> },
  { label: "เปิดรายละเอียด", hideLabel: true, className: "queue-open", cell: null },
];

// โครงคิวคำขอระหว่างรอข้อมูล (sidebar มาจาก hr/layout อยู่แล้ว)
export default function HrHomeLoading() {
  return (
    <SkeletonScreen className="page-content queue-page">
      <header className="queue-heading">
        <h1>คำขอรออนุมัติ</h1>
        <ul className="queue-summary">
          <li><Skeleton className="inline-block h-4 w-44 align-middle" /></li>
          <li><Skeleton className="inline-block h-4 w-24 align-middle" /></li>
        </ul>
      </header>

      <StatusTabsSkeleton active="home" />

      <section className="queue-sheet" aria-label="รายการคำขอรออนุมัติ">
        <QueueFiltersSkeleton selects={["แผนก", "ประเภทคำขอ"]} />
        <div className="queue-bulkbar">
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="queue-table-scroll">
          <SkeletonTable className="queue-table queue-table-rows" columns={COLUMNS} />
        </div>
        <footer className="queue-footer">
          <Skeleton className="h-4 w-56" />
        </footer>
      </section>
    </SkeletonScreen>
  );
}
