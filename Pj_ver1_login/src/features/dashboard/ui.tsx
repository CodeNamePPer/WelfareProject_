import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { cx } from '../../lib/cx';

// Shared building blocks for the Admin dashboard, sized to the Figma wireframe
// (node 163:1108) and coloured with the Style Guide tokens.

/** Large dashboard panel – Figma: 1px border, radius 10. Padding grows at sm so panel content sits clear of the edge. */
export function Panel({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[14px] sm:p-[20px]', className)} {...rest}>
      {children}
    </section>
  );
}

/** Bordered list row inside a panel – Figma: radius 10, gap 14. */
export function ItemCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center gap-[14px] rounded-[10px] border border-line bg-white px-[14px] py-[14px]', className)}>
      {children}
    </div>
  );
}

/** Outline "ดูทั้งหมด" button – Figma: height 30, radius 6, 13px medium. Width follows the label so headers never collide. */
export function OutlineButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-[30px] min-w-[96px] shrink-0 items-center justify-center rounded-[6px] border border-primary-600/40 bg-white px-[16px] text-13 font-medium text-primary-700',
        'transition-colors hover:border-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
        className,
      )}
      {...rest}
    />
  );
}

/** Shown in place of a panel's content when its data failed to load – never fake zeros. */
export function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-[10px] rounded-[10px] border border-dashed border-line px-[16px] py-[28px] text-center">
      <p className="text-14 text-ink">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="text-13 text-muted">ตัวเลขส่วนนี้ยังแสดงไม่ได้ ลองโหลดใหม่อีกครั้ง</p>
      <OutlineButton onClick={onRetry} className="gap-[6px]">
        <RotateCw className="size-[14px]" aria-hidden="true" />
        โหลดใหม่
      </OutlineButton>
    </div>
  );
}

export function PanelTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-16 font-semibold text-ink">
      {children}
    </h2>
  );
}

/**
 * ส่วนหนึ่งของแผ่นภาพรวม (/admin) – ไม่มีกรอบ/เงาของตัวเอง
 * แผ่นแม่ (DashboardPage) วาดเส้นแบ่งร่วมกันด้วย gap-px บนพื้นสีเส้น ทุกส่วนจึงเป็นแผ่นเดียวกัน ไม่ใช่การ์ดแยกใบ
 */
export function Region({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-[16px] bg-white p-[16px] sm:p-[20px]', className)} {...rest}>
      {children}
    </section>
  );
}

/** หัวส่วน: ชื่อ + บรรทัดรอง แล้วลิงก์ตัวหนังสือชิดขวา (ไม่ใช่ปุ่มกรอบ) */
export function RegionHeader({
  title,
  titleId,
  sub,
  onViewAll,
  viewAllLabel = 'ดูทั้งหมด',
}: {
  title: ReactNode;
  titleId: string;
  sub?: ReactNode;
  onViewAll?: () => void;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-[14px]">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <PanelTitle id={titleId}>{title}</PanelTitle>
        {sub ? <p className="text-13 text-muted tabular-nums">{sub}</p> : null}
      </div>
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded-[4px] text-13 font-medium text-primary-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {viewAllLabel}
        </button>
      ) : null}
    </div>
  );
}
