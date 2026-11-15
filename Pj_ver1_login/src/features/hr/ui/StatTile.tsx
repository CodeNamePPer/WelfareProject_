import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

// ช่องสรุปตัวเลขในแถบสรุปด้านบนของหน้า HR และการเงิน
export type StatTone = 'default' | 'warn' | 'finance' | 'success' | 'danger';
const toneClass: Record<StatTone, string> = { default: 'text-ink', warn: 'text-[#92400E]', finance: 'text-[#3730A3]', success: 'text-[#166534]', danger: 'text-[#991B1B]' };

export function StatTile({ label, value, note, tone = 'default' }: { label: ReactNode; value: ReactNode; note?: ReactNode; tone?: StatTone }) {
  return (
    <div className="min-w-0 flex-[1_1_160px] rounded-[8px] border border-line bg-white px-4 py-3.5">
      <p className="text-12 text-muted">{label}</p>
      <p className={cx('text-22 font-semibold tabular-nums', toneClass[tone])}>{value}</p>
      {note !== undefined && note !== null ? <p className="min-h-[18px] text-12 text-muted">{note}</p> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
