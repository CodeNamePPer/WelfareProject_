"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/cx";

/**
 * Pagination ตามแบบ TailGrids (API เดียวกับ `npx @tailgrids/cli add pagination`:
 * currentPage / totalPages / onPageChange, variant, sideLayout) แต่ใช้สีและขนาดตัวอักษรของระบบนี้
 * เพราะโปรเจกต์ไม่ได้ติดตั้ง theme token ของ TailGrids
 *
 * - default: ปุ่มก่อนหน้า/ถัดไปชิดซ้าย-ขวา เลขหน้าอยู่กลาง (Full Side Layout)
 * - compact: ทุกอย่างอยู่กลุ่มเดียวกัน สำหรับท้ายการ์ดเล็ก ๆ
 * เลขหน้าย่อด้วย … อัตโนมัติ และบนจอแคบแสดง "หน้า X จาก Y" แทนเลขหน้า
 */
export type PaginationProps = {
  /** หน้าปัจจุบัน เริ่มที่ 1 */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  variant?: "default" | "compact";
  /** full = ไอคอน + ข้อความ, label = ข้อความ (ซ่อนบนมือถือ), icon = ไอคอนอย่างเดียว */
  sideLayout?: "full" | "label" | "icon";
  className?: string;
};

type PageItem = number | "ellipsis-start" | "ellipsis-end";

/** 1 … 4 5 6 … 15 — แสดงหน้าแรก หน้าสุดท้าย และรอบหน้าปัจจุบัน */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(current - 1, total - 4));
  const end = Math.min(total - 1, Math.max(current + 1, 5));
  return [
    1,
    ...(start > 2 ? (["ellipsis-start"] as const) : []),
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    ...(end < total - 1 ? (["ellipsis-end"] as const) : []),
    total,
  ];
}

const pageButton =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-13 font-medium tabular-nums transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500";
const sideButton =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink transition-colors motion-reduce:transition-none hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  variant = "default",
  sideLayout = "full",
  className,
}: PaginationProps) {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);
  const go = (page: number) => {
    if (page >= 1 && page <= total && page !== current) onPageChange(page);
  };

  const side = (direction: "prev" | "next") => {
    const isPrev = direction === "prev";
    const label = isPrev ? "ก่อนหน้า" : "ถัดไป";
    const Icon = isPrev ? ChevronLeft : ChevronRight;
    const icon = sideLayout !== "label" ? <Icon className="size-4" aria-hidden="true" /> : null;
    const text =
      sideLayout === "icon" ? null : (
        <span className={sideLayout === "label" ? "hidden sm:inline" : undefined}>{label}</span>
      );
    return (
      <button
        type="button"
        className={cx(sideButton, sideLayout === "icon" && "w-9 px-0")}
        onClick={() => go(isPrev ? current - 1 : current + 1)}
        disabled={isPrev ? current <= 1 : current >= total}
        aria-label={isPrev ? "หน้าก่อนหน้า" : "หน้าถัดไป"}
      >
        {isPrev ? icon : null}
        {text}
        {!isPrev ? icon : null}
        {/* label-only บนมือถือยังต้องมีอะไรให้กด */}
        {sideLayout === "label" ? <Icon className="size-4 sm:hidden" aria-hidden="true" /> : null}
      </button>
    );
  };

  const numbers = (
    <>
      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(current, total).map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <button
                type="button"
                className={cx(
                  pageButton,
                  item === current ? "bg-primary-600 text-white" : "text-ink hover:bg-surface",
                )}
                aria-label={`หน้า ${item}`}
                aria-current={item === current ? "page" : undefined}
                onClick={() => go(item)}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} className="inline-flex h-9 min-w-9 items-center justify-center text-13 text-muted" aria-hidden="true">
              …
            </li>
          ),
        )}
      </ul>
      <p className="text-13 text-muted tabular-nums sm:hidden" aria-live="polite">
        หน้า {current} จาก {total}
      </p>
    </>
  );

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cx(
        "flex items-center gap-2",
        variant === "default" ? "w-full justify-between" : "justify-center",
        className,
      )}
    >
      {side("prev")}
      {numbers}
      {side("next")}
    </nav>
  );
}
