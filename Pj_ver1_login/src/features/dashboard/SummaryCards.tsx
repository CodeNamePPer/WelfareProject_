import type { ReactNode } from 'react';
import type { SummaryStats } from '../../types';
import { cx } from '../../lib/cx';

// Figma 163:1146 – four summary cards (radius 6, padding 16, height 120, gap 24).
function SummaryCard({ label, children, highlight }: { label: string; children: ReactNode; highlight?: boolean }) {
  return (
    <div
      className={cx(
        'flex min-h-[120px] flex-col gap-[6px] rounded-[6px] border bg-white p-[16px]',
        highlight ? 'border-primary-100' : 'border-line',
      )}
    >
      <p className="text-[12px] text-muted">{label}</p>
      {children}
    </div>
  );
}

function BigNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cx('text-[24px] font-semibold text-ink tabular-nums', className)}>{value.toLocaleString('th-TH')}</span>
  );
}

/** Value + "รายการ" on one line, indented like the Figma card (px 12, py 10). */
function InlineCount({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <p className="flex items-center gap-[10px] px-[12px] py-[10px]">
      <BigNumber value={value} className={highlight ? 'text-primary-700' : undefined} />
      <span className="text-[14px] text-muted">รายการ</span>
    </p>
  );
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  return (
    <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2 xl:grid-cols-[228fr_258fr_258fr_260fr] xl:gap-[24px]">
      <SummaryCard label="ผู้ใช้ทั้งหมด">
        <BigNumber value={stats.totalUsers} />
        <p className="text-[11px] text-muted">+{stats.newUsersThisCycle} คนในรอบนี้</p>
      </SummaryCard>

      <SummaryCard label="HR" highlight={stats.hrRequests > 0}>
        <InlineCount value={stats.hrRequests} />
      </SummaryCard>

      <SummaryCard label="รายการแจ้งเตือน" highlight={stats.notifications > 0}>
        <InlineCount value={stats.notifications} highlight={stats.notifications > 0} />
      </SummaryCard>

      <SummaryCard label="Error">
        <BigNumber value={stats.systemErrors} className={stats.systemErrors > 0 ? 'text-danger' : undefined} />
        <p className="text-[11px] text-muted">{stats.systemErrors === 0 ? 'ระบบทำงานปกติ' : 'ต้องได้รับการแก้ไข'}</p>
      </SummaryCard>
    </div>
  );
}
