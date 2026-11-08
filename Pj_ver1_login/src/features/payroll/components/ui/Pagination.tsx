"use client";

import { Icon } from "./Icon";
import { formatNumber } from "@/features/payroll/lib/format";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}

/**
 * คำนวณเลขหน้าที่จะโชว์ เช่น หน้า 6 จาก 12 -> [1, "…", 5, 6, 7, "…", 12]
 * แยกเป็นฟังก์ชันเพื่อให้ทดสอบได้ง่าย
 */
export function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** แถบเปลี่ยนหน้า: "แสดง 1 - 10 จาก 120 รายการ"  ‹ 1 2 3 › */
export function Pagination({ page, totalPages, total, from, to, onPageChange }: PaginationProps) {
  if (total === 0) return null;
  const btn =
    "grid size-9 place-items-center rounded-lg text-12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40";
  return (
    <nav aria-label="เปลี่ยนหน้า" className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="num text-12 text-muted">
        แสดง {formatNumber(from)} - {formatNumber(to)} จาก {formatNumber(total)} รายการ
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${btn} text-muted hover:bg-primary-50 disabled:opacity-40`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="หน้าก่อนหน้า"
        >
          <Icon name="chevronLeft" className="size-4" />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="w-6 text-center text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} num ${p === page ? "bg-primary-600 font-semibold text-white" : "text-ink hover:bg-primary-50"}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${btn} text-muted hover:bg-primary-50 disabled:opacity-40`}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="หน้าถัดไป"
        >
          <Icon name="chevronRight" className="size-4" />
        </button>
      </div>
    </nav>
  );
}
