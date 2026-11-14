import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { CLAIM_STATUS_LABEL, type ClaimDbStatus } from '@/lib/claims/types';

// ป้ายสถานะของ HR (สเปก: มุม 999px ตัว 12px)
export type BadgeTone = 'review' | 'revise' | 'finance' | 'approved' | 'paid' | 'rejected' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  review: 'bg-[#FEF3C7] text-[#92400E]',
  revise: 'bg-[#FFEDD5] text-[#9A3412]',
  finance: 'bg-[#E0E7FF] text-[#3730A3]',
  approved: 'bg-[#DCFCE7] text-[#166534]',
  paid: 'bg-[#DBEAFE] text-[#1E40AF]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B]',
  neutral: 'bg-slate-100 text-slate-600',
};

export function Badge({ tone, children, className }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-block rounded-[999px] px-2.5 py-px text-12 font-medium whitespace-nowrap', toneClass[tone], className)}>{children}</span>;
}

export const STATUS_TONE: Record<ClaimDbStatus, BadgeTone> = {
  draft: 'neutral',
  pending_hr: 'review',
  finance_returned: 'review',
  needs_revision: 'revise',
  pending_finance: 'finance',
  awaiting_payment: 'approved',
  paid: 'paid',
  rejected: 'rejected',
  cancelled: 'neutral',
};

/** ป้ายสถานะคำขอ ใช้คำชุดเดียวกับทุกฝ่าย (CLAIM_STATUS_LABEL) */
export function StatusBadge({ status, label }: { status: ClaimDbStatus; label?: string }) {
  return <Badge tone={STATUS_TONE[status]}>{label ?? CLAIM_STATUS_LABEL[status]}</Badge>;
}

/** ป้าย "ยื่นแทนโดย…" (สเปก: พื้น #FFFBEB ตัว #92400E ขอบ #FCD34D) */
export function ProxyBadge({ name, role = 'หัวหน้าแผนก', className }: { name: string; role?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-[999px] border border-[#FCD34D] bg-[#FFFBEB] px-2 text-11 text-[#92400E]', className)}>
      ยื่นแทนโดย {name}
      {role ? ` (${role})` : ''}
    </span>
  );
}

/** ตัวเลขงานค้างทรงกลมสี #1D4ED8 */
export function CountBadge({ count, label, className }: { count: number; label?: string; className?: string }) {
  if (!count) return null;
  return (
    <span className={cx('rounded-[9px] bg-[#1D4ED8] px-[7px] py-px text-11 font-medium text-white tabular-nums', className)}>
      {label ? <span className="sr-only">{label} </span> : null}
      {count}
    </span>
  );
}
