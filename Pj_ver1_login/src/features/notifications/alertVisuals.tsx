import { CircleAlert, ClockAlert, Gift, ListChecks, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { AlertCategory } from '../../types';

// ไอคอน/สี/ปลายทางของแต่ละประเภทแจ้งเตือน ใช้ร่วมกันระหว่างหน้าแจ้งเตือนและแผงแจ้งเตือนบนหน้าแรก

export type Tone = 'primary' | 'danger' | 'warning';

const icons: Record<AlertCategory, LucideIcon> = {
  access: ListChecks,
  security: ShieldAlert,
  system: CircleAlert,
  welfare: Gift,
  expiring: ClockAlert,
};

// สีเน้นเฉพาะที่สำคัญ: แดง = ความปลอดภัย, ส้ม = ใกล้หมดอายุ, ที่เหลือใช้ฟ้าตามธีม
export const toneOf = (category: AlertCategory): Tone =>
  category === 'security' ? 'danger' : category === 'expiring' ? 'warning' : 'primary';

const iconTone: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  danger: 'bg-status-rejected-soft text-danger',
  warning: 'bg-status-pending-soft text-status-pending-ink',
};

/** Where "ตรวจสอบ" takes the admin for each kind of alert. */
export const reviewHref: Partial<Record<AlertCategory, string>> = {
  access: '/admin/users',
  security: '/admin/logs',
  welfare: '/admin/benefits',
};

export function CategoryIcon({ category, size = 'md' }: { category: AlertCategory; size?: 'md' | 'sm' }) {
  const Icon = icons[category];
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center rounded-[8px]',
        size === 'md' ? 'size-[40px]' : 'size-[34px]',
        iconTone[toneOf(category)],
      )}
      aria-hidden="true"
    >
      <Icon className={size === 'md' ? 'size-[20px]' : 'size-[18px]'} strokeWidth={1.75} />
    </span>
  );
}

/** ปุ่ม "ตรวจสอบ" แบบทึบ – แดงสำหรับเหตุการณ์ความปลอดภัย ที่เหลือใช้สีหลัก */
export function reviewButtonClass(category: AlertCategory): string {
  return cx(
    'inline-flex h-[40px] shrink-0 sm:h-[32px] items-center justify-center rounded-[6px] px-[14px] text-13 font-medium whitespace-nowrap text-white transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none',
    toneOf(category) === 'danger'
      ? 'bg-danger hover:bg-status-rejected-ink focus-visible:ring-danger'
      : 'bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500',
  );
}
