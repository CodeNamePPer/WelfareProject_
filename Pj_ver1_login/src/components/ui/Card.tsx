import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={cx('rounded-xl border border-line bg-white shadow-card', className)}>
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, titleId, description, action }: CardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={titleId} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description ? <p className="mt-1 text-[13px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
