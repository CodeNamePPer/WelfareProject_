import { CircleAlert, ClockAlert, Gift, ListChecks, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { AdminAlert, AlertCategory } from '../../types';

// ไอคอน/สี/ปลายทางของแต่ละประเภทแจ้งเตือน ใช้ร่วมกันระหว่างหน้าแจ้งเตือนและแผงแจ้งเตือนบนหน้าแรก

export type Tone = 'primary' | 'danger' | 'warning' | 'neutral';

const icons: Record<AlertCategory, LucideIcon> = {
  access: ListChecks,
  security: ShieldAlert,
  system: CircleAlert,
  welfare: Gift,
  expiring: ClockAlert,
};

type ToneInput = Pick<AdminAlert, 'category' | 'actionable'>;

// แดงสงวนไว้ให้เหตุความปลอดภัยที่ยังต้องมีคนจัดการ (เช่น บัญชีถูกบล็อก)
// เหตุความปลอดภัยที่จบแล้ว (เช่น รีเซ็ตรหัสผ่านแล้ว) เป็นแค่บันทึก จึงใช้สีปกติ ไม่ทำให้หน้าดูมีเรื่องร้าย
// ส้ม = ใกล้หมดอายุ, ที่เหลือใช้ฟ้าตามธีม
export const toneOf = ({ category, actionable }: ToneInput): Tone => {
  if (category === 'security') return actionable ? 'danger' : 'neutral';
  if (category === 'expiring') return 'warning';
  return 'primary';
};

const iconTone: Record<Tone, string> = {
  primary: 'text-primary-600',
  danger: 'text-danger',
  warning: 'text-status-pending-ink',
  neutral: 'text-ink-mute',
};

/** Where "ตรวจสอบ" takes the admin for each kind of alert. */
export const reviewHref: Partial<Record<AlertCategory, string>> = {
  access: '/admin/users',
  security: '/admin/logs',
  welfare: '/admin/benefits?tab=proposals',
};

/** ไอคอนประเภทแจ้งเตือน – วางลอยบนพื้นแผ่น ไม่มีกล่องสีรองพื้น สีของเส้นไอคอนบอกระดับความสำคัญ */
export function CategoryIcon({ alert, size = 'md' }: { alert: ToneInput; size?: 'md' | 'sm' }) {
  const tone = toneOf(alert);
  const Icon = alert.category === 'security' && tone === 'neutral' ? ShieldCheck : icons[alert.category];
  return (
    <span
      className={cx('flex shrink-0 items-center justify-center', size === 'md' ? 'size-[40px]' : 'size-[34px]', iconTone[tone])}
      aria-hidden="true"
    >
      <Icon className={size === 'md' ? 'size-[22px]' : 'size-[20px]'} strokeWidth={1.75} />
    </span>
  );
}

/** ปุ่ม "ตรวจสอบ" แบบทึบ – แดงสำหรับเหตุความปลอดภัยที่ยังค้าง ที่เหลือใช้สีหลัก */
export function reviewButtonClass(alert: ToneInput): string {
  return cx(
    'inline-flex h-[40px] shrink-0 sm:h-[32px] items-center justify-center rounded-[6px] px-[14px] text-13 font-medium whitespace-nowrap text-white transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none',
    toneOf(alert) === 'danger'
      ? 'bg-danger hover:bg-status-rejected-ink focus-visible:ring-danger'
      : 'bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500',
  );
}
