import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';

const tones: Record<TagTone, string> = {
  success: 'bg-status-approved-soft text-status-approved-ink',
  warning: 'bg-status-pending-soft text-status-pending-ink',
  danger: 'bg-status-rejected-soft text-status-rejected-ink',
  info: 'bg-primary-100 text-primary-700',
  neutral: 'bg-surface text-muted ring-1 ring-inset ring-line',
  outline: 'bg-white text-ink ring-1 ring-inset ring-line',
};

// Small status / type label used in the Admin tables (Figma: 22px tall, radius 4).
export function Tag({ tone, children, className }: { tone: TagTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-[22px] items-center rounded-[4px] px-[8px] text-[12px] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
