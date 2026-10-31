import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'tonal';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 shadow-xs',
  secondary: 'border border-line bg-white text-ink hover:bg-surface hover:border-slate-300 transition-colors',
  ghost: 'text-muted hover:text-ink hover:bg-surface transition-colors',
  tonal: 'bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors motion-reduce:transition-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
