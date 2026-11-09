import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { FactsSkeleton, SkeletonLines, SkeletonTable, type SkeletonColumn } from "../../HrSkeletons";

const ENTITLEMENT_COLUMNS: SkeletonColumn[] = [
  { label: "สวัสดิการ", cell: <SkeletonLines main="w-36" meta="w-20" /> },
  { label: "วงเงิน", className: "queue-num", cell: <SkeletonLines main="w-20" meta="w-16" end /> },
  { label: "จำนวนครั้ง", cell: <Skeleton className="h-4 w-24" /> },
  { label: "ใช้ไปแล้ว", className: "queue-num", cell: <Skeleton className="ml-auto h-4 w-20" /> },
  { label: "สิทธิ์", cell: <Skeleton className="h-6 w-20 rounded-full" /> },
];

const REQUEST_COLUMNS: SkeletonColumn[] = [
  { label: "คำขอ", cell: <SkeletonLines main="w-36" meta="w-28" /> },
  { label: "ยอดเบิก", className: "queue-num", cell: <Skeleton className="ml-auto h-4 w-20" /> },
  { label: "สถานะ", cell: <Skeleton className="h-6 w-24 rounded-full" /> },
  { label: "วันที่", cell: <Skeleton className="h-4 w-24" /> },
];

function SheetHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="profile-sheet-head">
      <h2>{title}</h2>
      <Skeleton className={`h-4 max-w-full ${meta}`} />
    </div>
  );
}

// โครงโปรไฟล์พนักงาน ชื่อและรหัสยังไม่รู้จนกว่าข้อมูลจะมา
export default function EmployeeProfileLoading() {
  return (
    <SkeletonScreen className="page-content queue-page profile-page">
      <Skeleton className="h-4 w-44" />

      <header className="queue-heading">
        <Skeleton className="h-8 w-64 max-w-full" />
        <ul className="queue-summary">
          <li><Skeleton className="inline-block h-4 w-16 align-middle" /></li>
          <li><Skeleton className="inline-block h-6 w-20 rounded-full align-middle" /></li>
        </ul>
      </header>

      <section className="queue-sheet profile-sheet">
        <h2>ข้อมูลการทำงาน</h2>
        <FactsSkeleton count={7} />
      </section>

      <section className="queue-sheet">
        <SheetHead title="สิทธิสวัสดิการ" meta="w-96" />
        <div className="queue-table-scroll">
          <SkeletonTable className="queue-table" columns={ENTITLEMENT_COLUMNS} rows={5} />
        </div>
      </section>

      <section className="queue-sheet">
        <SheetHead title="คำขอสวัสดิการ" meta="w-48" />
        <div className="queue-table-scroll">
          <SkeletonTable className="queue-table" columns={REQUEST_COLUMNS} rows={4} />
        </div>
      </section>
    </SkeletonScreen>
  );
}
