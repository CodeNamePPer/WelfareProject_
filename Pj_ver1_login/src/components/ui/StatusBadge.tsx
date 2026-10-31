import type { ClaimStatus } from '../../types';
import { cx } from '../../lib/cx';

const config: Record<ClaimStatus, { label: string; badge: string; dot: string }> = {
  pending: {
    label: 'รอตรวจสอบ',
    badge: 'bg-status-pending-soft text-status-pending-ink',
    dot: 'bg-status-pending',
  },
  approved: {
    label: 'อนุมัติ',
    badge: 'bg-status-approved-soft text-status-approved-ink',
    dot: 'bg-status-approved',
  },
  rejected: {
    label: 'ปฏิเสธ',
    badge: 'bg-status-rejected-soft text-status-rejected-ink',
    dot: 'bg-status-rejected',
  },
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const { label, badge, dot } = config[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        badge,
      )}
    >
      <span className={cx('size-1.5 rounded-full', dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

export const statusLabel = (status: ClaimStatus): string => config[status].label;
export const statusDot = (status: ClaimStatus): string => config[status].dot;
