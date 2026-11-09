import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { SkeletonTable, type SkeletonColumn } from "../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "รหัส", cell: <Skeleton className="h-4 w-14" /> },
  { label: "ชื่อ-นามสกุล", cell: <Skeleton className="h-4 w-28" /> },
  { label: "แผนก", cell: <Skeleton className="h-4 w-16" /> },
  { label: "รายการ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เลขที่เอกสาร", cell: <Skeleton className="h-4 w-24" /> },
  { label: "วันที่", cell: <Skeleton className="h-4 w-20" /> },
  { label: "ยอดเบิก", cell: <Skeleton className="h-4 w-16" /> },
];

const FILTERS = ["แผนก:", "ประเภทสวัสดิการ:", "สถานะ:"];

export default function ReportsLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main reports-main">
        <div className="page-content reports-content">
          <h1>รายงานและสถิติ</h1>

          <section className="reports-filters" aria-label="ตัวกรองรายงาน">
            <div className="report-search-field">
              <span>ค้นหาเลขที่คำขอ / เลขที่เอกสาร / รหัส:</span>
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="report-date-range">
              <span>ช่วงเวลา:</span>
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            {FILTERS.map((label) => (
              <div key={label} className="report-filter-field">
                <span>{label}</span>
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </section>

          <section className="report-chart-card">
            <h2>สัดส่วนการใช้สวัสดิการแยกตามประเภท</h2>
            <p className="report-chart-legend"><span /> สัดส่วนการใช้งาน (%)</p>
            <div className="report-chart-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="report-chart-item">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </section>

          <section className="report-summary">
            <h2>สรุปยอด:</h2>
            <div className="report-table-card">
              <div className="report-table-wrap">
                <SkeletonTable className="report-table" columns={COLUMNS} rows={3} />
              </div>
            </div>
            <footer className="report-pagination">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </footer>
          </section>
        </div>
      </div>
    </SkeletonScreen>
  );
}
