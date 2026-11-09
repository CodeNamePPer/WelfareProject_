import type { ReactNode } from "react";
import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

// ชิ้นส่วนโครงหน้าของ HR ใช้ class เดียวกับหน้าจริงใน hr.css เพื่อไม่ให้หน้ากระตุกตอนข้อมูลมาถึง

export type SkeletonColumn = {
  label: string;
  /** หัวตารางที่หน้าจริงซ่อนจากสายตา เช่น คอลัมน์ลูกศรเปิดรายละเอียด */
  hideLabel?: boolean;
  className?: string;
  cell: ReactNode;
};

/** ข้อความหลัก + บรรทัดรองในเซลล์เดียว */
export function SkeletonLines({ main = "w-28", meta = "w-36", end = false }: { main?: string; meta?: string; end?: boolean }) {
  const align = end ? "ml-auto" : "";
  return (
    <div className="flex flex-col gap-[6px]">
      <Skeleton className={`h-4 max-w-full ${main} ${align}`} />
      <Skeleton className={`h-3 max-w-full ${meta} ${align}`} />
    </div>
  );
}

export function SkeletonTableRows({ columns, rows = 8, rowClassName }: { columns: SkeletonColumn[]; rows?: number; rowClassName?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className={rowClassName}>
          {columns.map((column) => (
            <td key={column.label} className={column.className} data-label={column.hideLabel ? undefined : column.label}>
              {column.cell}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonTable({ className, columns, rows }: { className: string; columns: SkeletonColumn[]; rows?: number }) {
  return (
    <table className={className}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.label} scope="col" className={column.className}>
              {column.hideLabel ? <span className="sr-only">{column.label}</span> : column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <SkeletonTableRows columns={columns} rows={rows} />
      </tbody>
    </table>
  );
}

/** ตัวเลขนับรายการบนหัวหน้าที่อ่านจากเบราว์เซอร์ หน่วงก่อนแสดงเพื่อไม่ให้กระพริบเมื่อโหลดเร็ว */
export function SkeletonCount({ label }: { label: string }) {
  return (
    <span className="inline-block animate-skeleton-in align-middle">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-28" />
    </span>
  );
}

const STATUS_TABS = [
  { id: "home", label: "รอตรวจ" },
  { id: "revision", label: "รอพนักงานแก้ไข" },
  { id: "rejected", label: "ปฏิเสธแล้ว" },
  { id: "approved", label: "อนุมัติแล้ว" },
];

export function StatusTabsSkeleton({ active }: { active: string }) {
  return (
    <div className="status-tabs-wrap">
      <div className="status-tabs">
        {STATUS_TABS.map((tab) => (
          <span key={tab.id} className={`status-tab${tab.id === active ? " active" : ""}`}>
            {tab.label}
            <span className="status-tab-count animate-pulse" aria-hidden="true">&nbsp;&nbsp;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function QueueFiltersSkeleton({ selects }: { selects: string[] }) {
  return (
    <div className="queue-filters">
      <div className="queue-search">
        <Skeleton className="h-[38px] w-full rounded-md" />
      </div>
      {selects.map((label) => (
        <div key={label} className="queue-select">
          <span>{label}</span>
          <Skeleton className="h-[38px] w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** รายการคำขอที่ดำเนินการแล้ว ใช้ร่วมกันทั้ง 3 แท็บเหมือน StatusList */
export function StatusListSkeleton({
  active,
  title,
  noteLabel,
  actorLabel,
  dateLabel,
}: {
  active: string;
  title: string;
  noteLabel?: string;
  actorLabel: string;
  dateLabel: string;
}) {
  const columns: SkeletonColumn[] = [
    { label: "พนักงาน", cell: <SkeletonLines main="w-32" meta="w-40" /> },
    { label: "คำขอ", cell: <SkeletonLines main="w-28" meta="w-32" /> },
    { label: "ยอดเบิก", className: "queue-num", cell: <Skeleton className="ml-auto h-4 w-20" /> },
    ...(noteLabel ? [{ label: noteLabel, cell: <Skeleton className="h-4 w-40 max-w-full" /> }] : []),
    { label: actorLabel, cell: <Skeleton className="h-4 w-24" /> },
    { label: dateLabel, cell: <Skeleton className="h-4 w-24" /> },
  ];

  return (
    <SkeletonScreen className="page-content queue-page">
      <header className="queue-heading">
        <h1>{title}</h1>
      </header>

      <StatusTabsSkeleton active={active} />

      <section className="queue-sheet" aria-label={title}>
        <QueueFiltersSkeleton selects={["แผนก", "ประเภทคำขอ"]} />
        <div className="queue-table-scroll">
          <SkeletonTable className="queue-table" columns={columns} />
        </div>
        <footer className="queue-footer queue-footer-paged">
          <Skeleton className="h-4 w-44" />
        </footer>
      </section>
    </SkeletonScreen>
  );
}

/** คู่หัวข้อ-ค่าในการ์ดรายละเอียด */
export function FactsSkeleton({ count, className = "profile-facts" }: { count: number; className?: string }) {
  return (
    <dl className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <dt><Skeleton className="h-3.5 w-24" /></dt>
          <dd><Skeleton className="mt-[6px] h-4 w-36 max-w-full" /></dd>
        </div>
      ))}
    </dl>
  );
}

function FormFieldsSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="profile-field">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}

/** ฟอร์มข้อมูลพนักงาน ใช้ทั้งหน้าเพิ่มและหน้าแก้ไข */
export function EmployeeFormSkeleton({
  title,
  identityTitle,
  sideTitle,
  identityFields,
  sideFields,
}: {
  title: string;
  identityTitle: string;
  sideTitle: string;
  identityFields: number;
  sideFields: number;
}) {
  return (
    <div className="employee-profile-form">
      <section className="employee-profile-card">
        <h2>{title}</h2>
        <div className="employee-profile-grid">
          <section className="employee-profile-identity">
            <h3>{identityTitle}</h3>
            <div className="employee-identity-fields">
              <FormFieldsSkeleton count={identityFields} />
            </div>
          </section>
          <section className="employee-profile-benefits">
            <h3>{sideTitle}</h3>
            <FormFieldsSkeleton count={sideFields} />
          </section>
        </div>
        <footer className="employee-profile-footer">
          <Skeleton className="h-4 w-48" />
          <div className="form-actions">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </footer>
      </section>
    </div>
  );
}

const HISTORY_COLUMNS: SkeletonColumn[] = [
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-28" /> },
  { label: "เลขที่เอกสาร", cell: <Skeleton className="h-4 w-28" /> },
  { label: "วันที่-เวลา", cell: <Skeleton className="h-4 w-28" /> },
  { label: "รายการกิจกรรม", cell: <Skeleton className="h-4 w-48 max-w-full" /> },
  { label: "ผู้ดำเนินการ", cell: <Skeleton className="h-4 w-20" /> },
];

/** เนื้อหาหน้าประวัติพนักงาน (หัวหน้าเป็นข้อความจริงอยู่แล้ว) */
export function EmployeeHistoryBodySkeleton() {
  return (
    <>
      <section className="employee-history-summary">
        <Skeleton className="h-5 w-64 max-w-full" />
        <div className="employee-history-profile">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-[6px]">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="employee-history-totals">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-[8px] h-7 w-28" />
            </div>
          ))}
        </div>
      </section>

      <section className="employee-history-records">
        <div className="employee-history-controls">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-72 max-w-full rounded-lg" />
        </div>
        <div className="employee-history-table-wrap">
          <SkeletonTable className="employee-history-table employee-history-expense-table" columns={HISTORY_COLUMNS} rows={4} />
        </div>
      </section>
    </>
  );
}

export const EMPLOYEE_APPROVAL_COLUMNS: SkeletonColumn[] = [
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-28" /> },
  { label: "ชื่อพนักงานใหม่", cell: <Skeleton className="h-4 w-32" /> },
  { label: "แผนก", cell: <Skeleton className="h-4 w-20" /> },
  { label: "ตำแหน่ง", cell: <Skeleton className="h-4 w-24" /> },
  { label: "วันที่ยื่นคำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "ดำเนินการ", cell: <Skeleton className="h-8 w-44 max-w-full rounded-md" /> },
];

export const BENEFIT_APPROVAL_COLUMNS: SkeletonColumn[] = [
  { label: "เลขที่คำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "ประเภทสวัสดิการ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "วงเงินที่เสนอ", cell: <Skeleton className="h-4 w-20" /> },
  { label: "รายละเอียด", cell: <Skeleton className="h-4 w-36 max-w-full" /> },
  { label: "ผู้ยื่นคำขอ", cell: <SkeletonLines main="w-28" meta="w-40" /> },
  { label: "วันที่ยื่นคำขอ", cell: <Skeleton className="h-4 w-24" /> },
  { label: "ดำเนินการ", cell: <Skeleton className="h-8 w-44 max-w-full rounded-md" /> },
];

/** หน้าติดตาม/อนุมัติคำขอเพิ่มพนักงานและสวัสดิการ */
export function PersonRequestsSkeleton({
  parent,
  title,
  contentClassName,
  filtersClassName,
  filters,
  tableClassName,
  columns,
  showFooter = false,
}: {
  parent: { label: string; href: string };
  title: string;
  contentClassName: string;
  filtersClassName?: string;
  /** ป้ายของตัวกรอง ไม่ใส่ = หน้านั้นไม่มีแถบตัวกรอง */
  filters?: string[];
  tableClassName: string;
  columns: SkeletonColumn[];
  showFooter?: boolean;
}) {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main employee-management-main">
        <div className={`page-content person-requests-content ${contentClassName}`}>
          <Breadcrumb className="breadcrumbs" items={[parent, { label: title }]} />
          <div className="person-requests-heading">
            <h1>{title}</h1>
            <Skeleton className="h-4 w-24" />
            <Link href={parent.href} className="person-requests-back-button">
              <span aria-hidden="true">←</span> ย้อนกลับ
            </Link>
          </div>

          <section className="person-requests-panel" aria-label={title}>
            {filters ? (
              <div className={filtersClassName}>
                {filters.map((label) => (
                  <div key={label} className="flex min-w-0 flex-col gap-[9px] text-13 text-muted">
                    <span>{label}</span>
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                ))}
                <Skeleton className="h-11 w-24 rounded-lg" />
              </div>
            ) : null}

            <div className="person-requests-table-wrap">
              <SkeletonTable className={tableClassName} columns={columns} rows={5} />
            </div>

            {showFooter ? (
              <footer className="person-requests-footer">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </footer>
            ) : null}
          </section>
        </div>
      </div>
    </SkeletonScreen>
  );
}
