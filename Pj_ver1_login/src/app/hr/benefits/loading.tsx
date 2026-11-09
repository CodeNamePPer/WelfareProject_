import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { SkeletonLines, SkeletonTable, type SkeletonColumn } from "../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "ชื่อสวัสดิการ", cell: <Skeleton className="h-4 w-36" /> },
  { label: "ประเภทสวัสดิการ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "จำนวนเงิน", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เงื่อนไขการเบิกจ่าย", cell: <SkeletonLines main="w-48" meta="w-40" /> },
  { label: "สถานะ", cell: <Skeleton className="h-6 w-16 rounded-full" /> },
];

export default function BenefitsLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main benefits-main">
        <div className="page-content benefits-content">
          <div className="benefits-heading">
            <div>
              <h1>รายการสวัสดิการ</h1>
              <p className="queue-meta">ดูได้อย่างเดียว การเพิ่มและแก้ไขสวัสดิการทำโดย Admin</p>
            </div>
            <div className="benefits-heading-actions">
              <Link href="/hr/benefits/approvals" className="button button-primary benefits-approve-button">
                อนุมัติคำขอเพิ่มสวัสดิการ
              </Link>
              <Link href="/hr/benefits/requests" className="button button-secondary benefits-track-button">
                ติดตามคำขอเพิ่มสวัสดิการ
              </Link>
            </div>
          </div>

          <section className="benefits-table-card" aria-label="รายการสวัสดิการ">
            <div className="benefits-table-wrap">
              <SkeletonTable className="benefits-table" columns={COLUMNS} rows={8} />
            </div>
          </section>
        </div>
      </div>
    </SkeletonScreen>
  );
}
