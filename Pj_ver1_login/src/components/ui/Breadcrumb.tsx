import Link from 'next/link';
import { cx } from '../../lib/cx';

export interface Crumb {
  label: string;
  /** No href = plain text. The last item is always the current page. */
  href?: string;
}

// Page trail shared by every role, shown above the title of a page reached from a list.
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="เส้นทางนำทาง" className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-[4px] p-0 text-12 text-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-[4px]">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !current ? (
                <Link href={item.href} className={cx('rounded text-muted no-underline hover:text-primary-700 hover:underline', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500')}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current ? 'page' : undefined} className={current ? 'text-ink' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
