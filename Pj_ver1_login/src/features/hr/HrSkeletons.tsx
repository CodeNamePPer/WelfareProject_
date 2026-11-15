import type { ReactNode } from "react";
import { Skeleton } from "@/components/Skeleton";
import { Card, PageHeader } from "@/features/hr/ui";
import { cx } from "@/lib/cx";

// ชิ้นส่วนโครงหน้าที่ loading.tsx ของ HR / การเงินใช้ร่วมกัน

/** หัวหน้า: ถ้ารู้ชื่อหน้าแสดงข้อความจริง ถ้าชื่อมาจากข้อมูล (เช่นเลขคำขอ) แสดงแท่งแทน */
export function HeadSkeleton({ title, description, crumbs = false, actions = 0 }: { title?: string; description?: string; crumbs?: boolean; actions?: number }) {
  const buttons = actions > 0 ? (
    <>
      {Array.from({ length: actions }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-28 rounded-full" />
      ))}
    </>
  ) : undefined;
  if (title) return <PageHeader title={title} description={description} actions={buttons} />;
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        {crumbs ? <Skeleton className="h-3 w-48" /> : null}
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      {buttons ? <div className="flex flex-wrap items-center gap-2">{buttons}</div> : null}
    </header>
  );
}

/** แถวช่องสรุปตัวเลข (StatRow + StatTile) */
export function StatsSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex min-w-0 flex-[1_1_160px] flex-col gap-2 rounded-[8px] border border-line bg-white px-4 py-3.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** แถบแท็บขีดเส้นใต้ */
export function TabsSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex gap-[18px] overflow-hidden border-b border-line px-5 py-3.5">
      {widths.map((width, index) => (
        <Skeleton key={index} className={cx("h-4 shrink-0", width)} />
      ))}
    </div>
  );
}

/** ตาราง: หัวคอลัมน์จริง + แถวที่แต่ละช่องมีรูปทรงตามข้อมูลจริง */
export function TableSkeleton({ cols, minWidth, head, cells, rows = 5 }: { cols: string; minWidth: string; head?: ReactNode[]; cells: ReactNode[]; rows?: number }) {
  return (
    <div className="overflow-hidden">
      <div className={minWidth}>
        {head ? (
          <div className={cx("grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted", cols)}>
            {head.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        ) : null}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className={cx("grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3.5", cols, !head && "first:border-t-0")}>
            {cells.map((cell, index) => (
              <span key={index} className="min-w-0">
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** ชื่อ + บรรทัดรองสองชั้น (ใช้ในช่องตาราง) */
export function TwoLines({ top = "w-40", bottom = "w-28", avatar = false }: { top?: string; bottom?: string; avatar?: boolean }) {
  const lines = (
    <span className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className={cx("h-4 max-w-full", top)} />
      <Skeleton className={cx("h-3 max-w-full", bottom)} />
    </span>
  );
  if (!avatar) return lines;
  return (
    <span className="flex items-center gap-2.5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      {lines}
    </span>
  );
}

/** การ์ดที่มีหัวข้อจริงและเนื้อหาเป็นช่องข้อมูล */
export function FieldsCard({ title, fields = 6, cols = "sm:grid-cols-3" }: { title?: string; fields?: number; cols?: string }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      {title ? <h2 className="text-16 font-semibold text-ink">{title}</h2> : <Skeleton className="h-5 w-40" />}
      <div className={cx("grid grid-cols-2 gap-3.5", cols)}>
        {Array.from({ length: fields }).map((_, index) => (
          <span key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </span>
        ))}
      </div>
    </Card>
  );
}

/** การ์ดที่มีหัวข้อจริงและบรรทัดข้อความ */
export function LinesCard({ title, lines = 3, children }: { title?: string; lines?: number; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2.5 p-5">
      {title ? <h2 className="text-16 font-semibold text-ink">{title}</h2> : <Skeleton className="h-5 w-40" />}
      {children ??
        Array.from({ length: lines }).map((_, index) => <Skeleton key={index} className={cx("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")} />)}
    </Card>
  );
}

/** การ์ดผู้ขอด้านซ้าย (RequesterFull) */
export function PersonCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-14 bg-mist" />
      <div className="flex flex-col gap-2 px-[18px] pb-4">
        <Skeleton className="-mt-8 size-[70px] rounded-full border-[3px] border-white" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-32" />
        <div className="mt-2 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}

/** พรีวิวการ์ดสวัสดิการด้านขวา (BenefitPreview) */
export function BenefitPreviewSkeleton({ label }: { label: string }) {
  return (
    <>
      <p className="text-12 font-semibold text-muted">{label}</p>
      <div className="overflow-hidden rounded-[8px] border border-line bg-white">
        <Skeleton className="h-[150px] w-full rounded-none" />
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <div className="mt-1 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </>
  );
}

/** รายการแจ้งเตือนจัดกลุ่มตามวัน */
export function NoticeListSkeleton({ groups = [3, 3] }: { groups?: number[] }) {
  return groups.map((count, group) => (
    <div key={group}>
      <div className={cx("bg-[#F8FAFC] px-5 py-2.5", group > 0 && "border-t border-[#F1F5F9]")}>
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-3.5 border-t border-[#F1F5F9] px-4 py-3.5 sm:px-5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </span>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  ));
}
