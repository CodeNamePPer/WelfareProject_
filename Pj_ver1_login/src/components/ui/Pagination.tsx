import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../../lib/cx';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  unit?: string;
  onChange: (page: number) => void;
}

/** Returns the slice of `items` for a 1-based page. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// Footer "แสดง 1–7 จาก 31 รายการ" + numbered pager (Figma: 32×32 squares, radius 6).
export function Pagination({ page, pageSize, total, unit = 'รายการ', onChange }: PaginationProps) {
  const pages = pageCount(total, pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const square =
    'inline-flex size-[32px] items-center justify-center rounded-[6px] border text-[13px] tabular-nums transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="เลือกหน้า" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] text-muted tabular-nums">
        แสดง {from}–{to} จาก {total} {unit}
      </p>
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          className={cx(square, 'border-line bg-white text-ink hover:bg-primary-50')}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            className={cx(
              square,
              number === page
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-line bg-white text-ink hover:bg-primary-50',
            )}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className={cx(square, 'border-line bg-white text-ink hover:bg-primary-50')}
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="หน้าถัดไป"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
