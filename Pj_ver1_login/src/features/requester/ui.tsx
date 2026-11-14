import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Activity, BookOpen, Bus, Gift, HeartPulse, Users, type LucideIcon } from 'lucide-react';
import { Breadcrumb, type Crumb } from '@/components/ui/Breadcrumb';
import { cx } from '@/lib/cx';
import { CLAIM_STATUS_LABEL, type ClaimDbStatus } from '@/lib/claims/types';

// ชิ้นส่วนหน้าจอของฝั่งผู้ส่งคำขอ (/employee) ตามดีไซน์ "แบบ C": การ์ดขอบบาง ปุ่มและป้ายสถานะทรงแคปซูล

/** แผ่นเนื้อหาสีขาวขอบบาง */
export function Sheet({ className, ...rest }: ComponentProps<'section'>) {
  return <section className={cx('rounded-lg border border-line bg-white', className)} {...rest} />;
}

const pillBase =
  'inline-flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-full px-[18px] text-13 font-medium whitespace-nowrap no-underline transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/** คลาสของปุ่มทรงแคปซูล ใช้ได้ทั้ง <Link> และ <button> */
export const pill = {
  primary: cx(pillBase, 'bg-primary-600 text-white hover:bg-primary-700'),
  outline: cx(pillBase, 'border border-primary-600 bg-white text-primary-600 hover:bg-primary-50'),
  quiet: cx(pillBase, 'border border-slate-300 bg-white px-4 font-normal text-ink-soft hover:bg-surface'),
};

export const inputClass =
  'h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-14 text-ink outline-none placeholder:text-muted focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
export const labelClass = 'mb-1.5 block text-13 font-medium text-ink-soft';

/** หัวหน้า: เส้นทาง (ถ้ามี) ชื่อหน้า คำอธิบาย และปุ่มด้านขวา */
export function PageHead({ crumbs, title, description, children }: { crumbs?: Crumb[]; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs ? <Breadcrumb items={crumbs} className="mb-1" /> : null}
        <h1 className="text-22 font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-0.5 text-13 text-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

type Tone = 'amber' | 'orange' | 'blue' | 'green' | 'red' | 'slate';

const toneClass: Record<Tone, string> = {
  amber: 'bg-status-pending-soft text-status-pending-ink',
  orange: 'bg-orange-100 text-orange-800',
  blue: 'bg-primary-100 text-primary-700',
  green: 'bg-status-approved-soft text-status-approved-ink',
  red: 'bg-status-rejected-soft text-status-rejected-ink',
  slate: 'bg-slate-100 text-slate-600',
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cx('inline-block rounded-full px-2.5 py-px text-12 font-medium whitespace-nowrap', toneClass[tone])}>{children}</span>;
}

const STATUS_TONE: Record<ClaimDbStatus, Tone> = {
  draft: 'slate',
  pending_hr: 'amber',
  needs_revision: 'orange',
  pending_finance: 'amber',
  finance_returned: 'amber',
  awaiting_payment: 'green',
  paid: 'blue',
  rejected: 'red',
  cancelled: 'slate',
};

/** ป้ายสถานะคำขอ ใช้คำชุดเดียวกับทุกฝ่าย (CLAIM_STATUS_LABEL) */
export function ClaimPill({ status }: { status: ClaimDbStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{CLAIM_STATUS_LABEL[status]}</Pill>;
}

/** แถบวงเงิน: น้ำเงิน = ใช้ไปแล้ว, เหลืองอำพัน = กันไว้รอตรวจ */
export function UsageBar({ used, pending, limit, size = 'sm', label }: { used: number; pending: number; limit: number; size?: 'sm' | 'lg'; label?: string }) {
  const usedPct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const pendingPct = limit > 0 ? Math.min((pending / limit) * 100, 100 - usedPct) : 0;
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx('flex overflow-hidden bg-mist', size === 'lg' ? 'h-3 gap-0.5 rounded-md' : 'h-1.5 gap-px rounded-sm')}
    >
      <div className="bg-primary-700" style={{ width: `${usedPct}%` }} />
      <div className="bg-amber-500" style={{ width: `${pendingPct}%` }} />
    </div>
  );
}

const CATEGORY_ICON: [RegExp, LucideIcon][] = [
  [/สุขภาพ|รักษา|แพทย์/, HeartPulse],
  [/พัฒนา|อบรม|ศึกษา/, BookOpen],
  [/เดินทาง/, Bus],
  [/ครอบครัว|บุตร/, Users],
  [/กีฬา|ออกกำลัง/, Activity],
];

/** ภาพแทนสวัสดิการ ฐานข้อมูลยังไม่มีรูปของแต่ละรายการ จึงใช้ไอคอนตามหมวด */
export function BenefitThumb({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICON.find(([pattern]) => pattern.test(category))?.[1] ?? Gift;
  return (
    <div aria-hidden="true" className={cx('flex shrink-0 items-center justify-center bg-mist text-muted', className)}>
      <Icon className="size-6" strokeWidth={1.5} />
    </div>
  );
}

/** แถวตารางแบบ grid ที่กดได้ทั้งแถว */
export function RowLink({ href, className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cx(
        'grid items-center gap-3 border-t border-slate-100 px-5 text-ink no-underline transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none motion-reduce:transition-none',
        className,
      )}
      {...rest}
    />
  );
}

/** สถานะว่างในแผ่นเนื้อหา */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="border-t border-slate-100 px-5 py-10 text-center text-13 text-muted">{children}</p>;
}
