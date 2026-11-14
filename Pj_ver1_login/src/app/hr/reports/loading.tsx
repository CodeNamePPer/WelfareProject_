import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { SkeletonTable, type SkeletonColumn } from "../HrSkeletons";

const COLUMNS: SkeletonColumn[] = [
  { label: "พนักงาน", cell: <Skeleton className="h-4 w-28" /> },
  { label: "แผนก", cell: <Skeleton className="h-4 w-16" /> },
  { label: "สวัสดิการ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "เลขที่คำขอ / เอกสาร", cell: <Skeleton className="h-4 w-24" /> },
  { label: "วันที่ยื่น", cell: <Skeleton className="h-4 w-20" /> },
  { label: "สถานะ", cell: <Skeleton className="h-4 w-16" /> },
  { label: "ยอดเบิก", cell: <Skeleton className="h-4 w-16" /> },
];

const FILTERS = ["แผนก:", "ประเภทสวัสดิการ:", "สถานะ:"];

export default function ReportsLoading() {
  return (
    <SkeletonScreen className="page-content reports-content">
      <header className="reports-heading">
        <div>
          <h1>รายงานและสถิติ</h1>
          <p>ภาพรวมคำขอสวัสดิการ พร้อมค้นหา กรอง และส่งออกข้อมูลตามช่วงเวลาที่ต้องการ</p>
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </header>

      <section className="reports-filters" aria-label="ตัวกรองรายงาน">
        <div className="report-search-field">
          <span>ค้นหาข้อมูล</span>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <div className="report-date-range">
          <span>ช่วงวันที่ยื่นคำขอ</span>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        {FILTERS.map((label) => (
          <div key={label} className="report-filter-field">
            <span>{label.replace(":", "")}</span>
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-28 rounded-lg" />
      </section>

      <section className="report-metrics" aria-label="สรุปผลตามตัวกรอง">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="report-metric" key={index}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </section>

      <section className="report-chart-card">
        <div className="report-section-heading">
          <div>
            <h2>สัดส่วนคำขอตามประเภทสวัสดิการ</h2>
            <p>คำนวณจากรายการที่ตรงกับตัวกรอง</p>
          </div>
        </div>
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
        <div className="report-table-heading">
          <div>
            <h2>รายการคำขอสวัสดิการ</h2>
            <p>กำลังโหลดข้อมูลรายงาน</p>
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
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
    </SkeletonScreen>
  );
}
