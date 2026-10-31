import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/cx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  wrapperClassName?: string;
}

export function Select({ label, wrapperClassName, className, children, ...rest }: SelectProps) {
  return (
    <label className={cx('relative block', wrapperClassName)}>
      <span className="sr-only">{label}</span>
      <select
        className={cx(
          'h-10 w-full appearance-none rounded-lg border border-line bg-white pr-9 pl-3 text-[13px] text-ink hover:border-muted/60 focus-visible:border-primary-500',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </label>
  );
}
