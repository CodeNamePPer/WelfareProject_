import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight, ClipboardList, LogIn, ShieldAlert, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SummaryStats } from '../../types';
import { cx } from '../../lib/cx';
import { NumberTicker } from '../../components/ui/NumberTicker';

// Figma 163:1146 – four summary cards (radius 6, padding 16), laid out 2×2 as the left tile of the bento grid.
// Each card: icon + label, a headline number with a small visual beside or under it, and one line of context.
// Each card links to the page that holds its details.

type Tone = 'primary' | 'danger';

const iconTone: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  danger: 'bg-status-rejected-soft text-danger',
};

function SummaryCard({
  label,
  href,
  icon: Icon,
  tone = 'primary',
  highlight,
  children,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  tone?: Tone;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex min-h-[132px] flex-col gap-[12px] rounded-[6px] border bg-white p-[16px] transition-colors',
        'hover:border-primary-500 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
        highlight ? 'border-primary-100' : 'border-line',
      )}
    >
      <span className="flex items-center gap-[10px]">
        <span className={cx('flex size-[28px] shrink-0 items-center justify-center rounded-[6px]', iconTone[tone])}>
          <Icon className="size-[16px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-13 font-medium text-ink-soft">{label}</span>
        <ChevronRight className="size-[16px] shrink-0 text-muted group-hover:text-primary-600" aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col justify-end gap-[8px]">{children}</span>
    </Link>
  );
}

/** Headline number + unit. null = โหลดไม่สำเร็จ → "—" แทนตัวเลข */
function Headline({ value, unit, className }: { value: number | null; unit: string; className?: string }) {
  if (value === null) {
    return (
      <span className="text-24 font-semibold leading-none text-muted" aria-label="ไม่มีข้อมูล">
        —
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-[6px]">
      <NumberTicker value={value} className={cx('text-24 font-semibold leading-none text-ink', className)} />
      <span className="text-13 text-muted">{unit}</span>
    </span>
  );
}

function LoadFailed() {
  return <span className="text-12 text-danger">โหลดข้อมูลไม่สำเร็จ</span>;
}

/** One muted line of context; children are joined with a middle dot. */
function MetaLine({ parts }: { parts: ReactNode[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-[6px] text-12 text-muted tabular-nums">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-[6px]">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}

function Pill({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'pending' | 'neutral' }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-[8px] py-[2px] text-11 font-medium tabular-nums',
        tone === 'pending' && 'bg-status-pending-soft text-status-pending-ink',
        tone === 'primary' && 'bg-primary-50 text-primary-700',
        tone === 'neutral' && 'bg-paper text-muted',
      )}
    >
      {children}
    </span>
  );
}

/** Horizontal bar split into coloured segments (e.g. active vs inactive users). */
function SegmentBar({ label, segments }: { label: string; segments: { value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <span role="img" aria-label={label} className="flex h-[6px] w-full overflow-hidden rounded-[3px] bg-mist">
      {total > 0
        ? segments.map((s, i) =>
            s.value > 0 ? <span key={i} className={cx('h-full', s.className)} style={{ width: `${(s.value / total) * 100}%` }} /> : null,
          )
        : null}
    </span>
  );
}

const WEEKDAY = new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' });

/** 7 tiny bars, oldest first; the last bar (today) is drawn in full colour. */
function Sparkbars({ values, label, tone = 'primary' }: { values: number[]; label: string; tone?: Tone }) {
  const max = Math.max(...values, 1);
  const now = Date.now();
  return (
    <span role="img" aria-label={label} className="flex h-[32px] shrink-0 items-end gap-[3px]">
      {values.map((v, i) => {
        const isToday = i === values.length - 1;
        const day = WEEKDAY.format(new Date(now - (values.length - 1 - i) * 24 * 60 * 60 * 1000));
        return (
          <span
            key={i}
            title={`${day}: ${v.toLocaleString('th-TH')}`}
            className={cx(
              'w-[6px] rounded-[2px]',
              tone === 'danger'
                ? isToday ? 'bg-danger' : 'bg-danger/30'
                : isToday ? 'bg-primary-600' : 'bg-primary-500/30',
            )}
            style={{ height: v === 0 ? '2px' : `${Math.max((v / max) * 100, 12)}%` }}
          />
        );
      })}
    </span>
  );
}

/** ISO -> "5 นาทีก่อน" / "3 ชม.ก่อน" / "2 วันก่อน" – short enough for one card line */
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} นาทีก่อน`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชม.ก่อน`;
  return `${Math.round(hours / 24)} วันก่อน`;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  const { users, hrQueue, logins, loginErrors } = stats;
  const errorTotal = loginErrors ? loginErrors.failed + loginErrors.blocked : null;

  return (
    <div className="grid h-full grid-cols-1 gap-[16px] sm:grid-cols-2 xl:gap-[24px]">
      <SummaryCard label="ผู้ใช้ทั้งหมด" href="/admin/users" icon={UsersRound}>
        <span className="flex items-center justify-between gap-[8px]">
          <Headline value={users?.active ?? null} unit="คน" />
          {users && users.newThisMonth !== null ? (
            <Pill tone={users.newThisMonth > 0 ? 'primary' : 'neutral'}>+{users.newThisMonth} เดือนนี้</Pill>
          ) : null}
        </span>
        {users === null ? (
          <LoadFailed />
        ) : (
          <>
            <SegmentBar
              label={`ใช้งาน ${users.active} คน พ้นสภาพ ${users.inactive} คน`}
              segments={[
                { value: users.active, className: 'bg-primary-500' },
                { value: users.inactive, className: 'bg-ink-mute/40' },
              ]}
            />
            <MetaLine
              parts={[
                <LegendDot key="a" className="bg-primary-500" text={`ใช้งาน ${users.active.toLocaleString('th-TH')}`} />,
                <LegendDot key="i" className="bg-ink-mute/40" text={`พ้นสภาพ ${users.inactive.toLocaleString('th-TH')}`} />,
              ]}
            />
          </>
        )}
      </SummaryCard>

      <SummaryCard
        label="คำขอรอ HR ตรวจ"
        href="/admin/benefits?tab=claims"
        icon={ClipboardList}
        highlight={(hrQueue?.pending ?? 0) > 0}
      >
        <span className="flex items-center justify-between gap-[8px]">
          <Headline
            value={hrQueue?.pending ?? null}
            unit="รายการ"
            className={(hrQueue?.pending ?? 0) > 0 ? 'text-primary-700' : undefined}
          />
          {hrQueue?.oldestPendingDays != null ? (
            <Pill tone={hrQueue.oldestPendingDays > 7 ? 'pending' : 'primary'}>
              เก่าสุด {hrQueue.oldestPendingDays} วัน
            </Pill>
          ) : null}
        </span>
        {hrQueue === null ? (
          <LoadFailed />
        ) : (
          <>
            <SegmentBar
              label={`รอตรวจ ${hrQueue.pending} อนุมัติ ${hrQueue.approved} ไม่อนุมัติ ${hrQueue.rejected}`}
              segments={[
                { value: hrQueue.pending, className: 'bg-status-pending' },
                { value: hrQueue.approved, className: 'bg-status-approved' },
                { value: hrQueue.rejected, className: 'bg-status-rejected' },
              ]}
            />
            <MetaLine
              parts={[
                <LegendDot key="p" className="bg-status-pending" text={`รอ ${hrQueue.pending}`} />,
                <LegendDot key="a" className="bg-status-approved" text={`อนุมัติ ${hrQueue.approved}`} />,
                <LegendDot key="r" className="bg-status-rejected" text={`ไม่อนุมัติ ${hrQueue.rejected}`} />,
              ]}
            />
          </>
        )}
      </SummaryCard>

      <SummaryCard label="เข้าใช้งานวันนี้" href="/admin/logs" icon={LogIn}>
        <span className="flex items-end justify-between gap-[8px]">
          <Headline value={logins?.today ?? null} unit="คน" />
          {logins ? (
            <Sparkbars values={logins.daily} label={`ผู้เข้าใช้งาน 7 วันล่าสุด: ${logins.daily.join(', ')} คน`} />
          ) : null}
        </span>
        {logins === null ? (
          <LoadFailed />
        ) : (
          <MetaLine
            parts={[
              `เฉลี่ย ${(sum(logins.daily) / logins.daily.length).toLocaleString('th-TH', { maximumFractionDigits: 1 })} คน/วัน`,
              '7 วันล่าสุด',
            ]}
          />
        )}
      </SummaryCard>

      <SummaryCard label="ล็อกอินผิดพลาด" href="/admin/logs" icon={ShieldAlert} tone={(errorTotal ?? 0) > 0 ? 'danger' : 'primary'}>
        <span className="flex items-end justify-between gap-[8px]">
          <Headline value={errorTotal} unit="ครั้ง" className={(errorTotal ?? 0) > 0 ? 'text-danger' : undefined} />
          {loginErrors ? (
            <Sparkbars
              values={loginErrors.daily}
              tone="danger"
              label={`ล็อกอินผิดพลาด 7 วันล่าสุด: ${loginErrors.daily.join(', ')} ครั้ง`}
            />
          ) : null}
        </span>
        {loginErrors === null ? (
          <LoadFailed />
        ) : errorTotal === 0 ? (
          <MetaLine parts={['ไม่พบใน 7 วัน', 'ระบบปกติ']} />
        ) : (
          <span className="flex flex-col gap-[2px]">
            <MetaLine parts={[`รหัสผิด ${loginErrors.failed}`, `ถูกบล็อก ${loginErrors.blocked}`]} />
            {loginErrors.lastAt ? (
              <span className="text-12 text-muted">ล่าสุด {timeAgo(loginErrors.lastAt)}</span>
            ) : null}
          </span>
        )}
      </SummaryCard>
    </div>
  );
}

function LegendDot({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-[4px]">
      <span className={cx('size-[6px] rounded-full', className)} aria-hidden="true" />
      {text}
    </span>
  );
}
