import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';

// การ์ดของ HR (สเปก: พื้นขาว ขอบ 1px #E2E8F0 มุม 8px ไม่มีเงา)

export const cardClass = 'rounded-[8px] border border-line bg-white';

export function Card({ className, ...rest }: ComponentProps<'section'>) {
  return <section className={cx(cardClass, className)} {...rest} />;
}

/** หัวการ์ด: หัวข้อ 16px/600 คำอธิบาย และปุ่มด้านขวา */
export function CardHeader({ title, titleId, description, action, className }: { title: ReactNode; titleId?: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-wrap items-start justify-between gap-3 px-5 pt-4', className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="text-16 font-semibold text-ink">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-13 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** ข้อความว่างภายในการ์ด */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="border-t border-slate-100 px-5 py-10 text-center text-13 text-muted">{children}</p>;
}
