import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

// ช่องสรุปตัวเลขในแถบสรุปด้านบนของหน้า HR
export function StatTile({ label, value, note, tone = 'default' }: { label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <div className="min-w-0 flex-[1_1_160px] rounded-[8px] border border-line bg-white px-4 py-3.5">
      <p className="text-12 text-muted">{label}</p>
      <p className={cx('text-22 font-semibold tabular-nums', tone === 'warn' ? 'text-[#92400E]' : 'text-ink')}>{value}</p>
      {note ? <p className="text-12 text-muted">{note}</p> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
