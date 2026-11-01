import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { SummaryStats } from '../../types';
import { cx } from '../../lib/cx';

// Figma 163:1146 – four summary cards (radius 6, padding 16, height 120, gap 24).
// Each card links to the page that holds its details.
function SummaryCard({
  label,
  href,
  children,
  highlight,
}: {
  label: string;
  href: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex min-h-[120px] flex-col gap-[6px] rounded-[6px] border bg-white p-[16px] transition-colors',
        'hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
        highlight ? 'border-primary-100' : 'border-line',
      )}
    >
      <span className="flex items-center justify-between gap-[8px]">
        <span className="text-12 text-muted">{label}</span>
        <ChevronRight className="size-[16px] text-muted group-hover:text-primary-600" aria-hidden="true" />
      </span>
      {children}
    </Link>
  );
}

/** null = โหลดไม่สำเร็จ → "—" แทนตัวเลข */
function BigNumber({ value, className }: { value: number | null; className?: string }) {
  if (value === null) {
    return (
      <span className="text-24 font-semibold text-muted" aria-label="ไม่มีข้อมูล">
        —
      </span>
    );
  }
  return (
    <span className={cx('text-24 font-semibold text-ink tabular-nums', className)}>{value.toLocaleString('th-TH')}</span>
  );
}

function LoadFailed() {
  return <p className="text-12 text-danger">โหลดข้อมูลไม่สำเร็จ</p>;
}

/** Value + "รายการ" on one baseline, aligned with the other cards' numbers. */
function InlineCount({ value, highlight }: { value: number | null; highlight?: boolean }) {
  if (value === null) return <BigNumber value={null} />;
  return (
    <p className="flex items-baseline gap-[8px]">
      <BigNumber value={value} className={highlight ? 'text-primary-700' : undefined} />
      <span className="text-14 text-muted">รายการ</span>
    </p>
  );
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  return (
    <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 xl:grid-cols-[228fr_258fr_258fr_260fr] xl:gap-[24px]">
      <SummaryCard label="ผู้ใช้ทั้งหมด" href="/admin/users">
        <BigNumber value={stats.totalUsers} />
        {stats.totalUsers === null ? (
          <LoadFailed />
        ) : stats.newUsersThisCycle === null ? null : (
          <p className="text-11 text-muted">+{stats.newUsersThisCycle} คนในรอบนี้</p>
        )}
      </SummaryCard>

      <SummaryCard label="HR" href="/admin/benefits?tab=claims" highlight={(stats.hrRequests ?? 0) > 0}>
        <InlineCount value={stats.hrRequests} />
        {stats.hrRequests === null ? <LoadFailed /> : null}
      </SummaryCard>

      <SummaryCard label="รายการแจ้งเตือน" href="/admin/notifications" highlight={(stats.notifications ?? 0) > 0}>
        <InlineCount value={stats.notifications} highlight={(stats.notifications ?? 0) > 0} />
        {stats.notifications === null ? <LoadFailed /> : null}
      </SummaryCard>

      <SummaryCard label="Error" href="/admin/logs">
        <BigNumber value={stats.systemErrors} className={(stats.systemErrors ?? 0) > 0 ? 'text-danger' : undefined} />
        {stats.systemErrors === null ? (
          <LoadFailed />
        ) : (
          <p className="text-11 text-muted">{stats.systemErrors === 0 ? 'ระบบทำงานปกติ' : 'ต้องได้รับการแก้ไข'}</p>
        )}
      </SummaryCard>
    </div>
  );
}
