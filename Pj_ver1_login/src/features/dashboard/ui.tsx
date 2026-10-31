import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';

// Shared building blocks for the Admin dashboard, sized to the Figma wireframe
// (node 163:1108) and coloured with the Style Guide tokens.

/** Large dashboard panel – Figma: 1px border, radius 10, padding 14. */
export function Panel({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-[14px] rounded-[10px] border border-line bg-white p-[14px]', className)} {...rest}>
      {children}
    </section>
  );
}

/** Bordered list row inside a panel – Figma: radius 10, padding 18/14, gap 14. */
export function ItemCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-center gap-[14px] rounded-[10px] border border-line bg-white px-[14px] py-[18px]', className)}>
      {children}
    </div>
  );
}

/** Outline "ดูทั้งหมด" button – Figma: 119×30, radius 6, 13px medium. */
export function OutlineButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-[30px] w-[119px] shrink-0 items-center justify-center rounded-[6px] border border-primary-600/40 bg-white px-[16px] text-[13px] font-medium text-primary-700',
        'transition-colors hover:border-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
        className,
      )}
      {...rest}
    />
  );
}

export function PanelTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[16px] font-semibold text-ink">
      {children}
    </h2>
  );
}
