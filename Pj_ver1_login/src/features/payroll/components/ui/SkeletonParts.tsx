import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

/*
 * ชิ้นส่วน skeleton ที่ใช้ซ้ำทุกหน้า วางขนาดตรงกับของจริง
 * (แถวตาราง 52px, ช่องกรอก 44px) เพื่อให้ตอนข้อมูลมาแล้วหน้าไม่กระตุก
 */

/** กล่องครอบ skeleton: บอก screen reader ว่ากำลังโหลด */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label}>
      {children}
      <span className="sr-only">กำลังโหลด…</span>
    </div>
  );
}

/** ช่องกรอง 1 ช่อง: ป้ายชื่อ + ช่องกรอก */
export function FieldSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-11" />
    </div>
  );
}

/** ตาราง: หัวตาราง + แถว */
export function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="border-y border-line">
      <div className="flex h-11 items-center gap-6 bg-surface px-4 md:px-5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-[52px] items-center gap-6 border-t border-line px-4 md:px-5">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** แถบเลขหน้าใต้ตาราง */
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-9 w-48" />
    </div>
  );
}

/**
 * กล่องรายการ (หน้าตาเหมือน ListPanel)
 *   heading   : "title" = หัวข้อ, "tabs" = แท็บสถานะ, "none" = ไม่มีหัว
 *   filters   : จำนวนช่องกรอง   filterGrid: class grid ของแถวกรอง (ให้ตรงหน้าจริง)
 *   button    : มีปุ่ม "ค้นหา" ท้ายแถวกรองไหม
 */
export function ListPanelSkeleton({
  heading = "title",
  filters,
  filterGrid = "md:grid-cols-2",
  button = false,
  rows = 8,
  cols,
}: {
  heading?: "title" | "tabs" | "none";
  filters: number;
  filterGrid?: string;
  button?: boolean;
  rows?: number;
  cols: number;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 p-4 md:p-5">
        {heading === "title" && <Skeleton className="h-6 w-48" />}
        {heading === "tabs" && (
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        )}
        <div className={`grid gap-3 md:items-end ${filterGrid}`}>
          {Array.from({ length: filters }, (_, i) => (
            <FieldSkeleton key={i} />
          ))}
          {button && <Skeleton className="h-11 md:w-36" />}
        </div>
      </div>
      <TableSkeleton rows={rows} cols={cols} />
      <div className="px-4 md:px-5">
        <PaginationSkeleton />
      </div>
    </Card>
  );
}

/** แถบตัวเลขสรุป 3 ช่อง (หน้าตาเหมือน SummaryStrip) */
export function SummaryStripSkeleton() {
  return (
    <div className="grid divide-y divide-line rounded-xl border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 px-5 py-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-36" />
        </div>
      ))}
    </div>
  );
}
