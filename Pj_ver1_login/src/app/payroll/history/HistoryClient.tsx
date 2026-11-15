'use client';

import Link from 'next/link';
import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { ButtonLink, Card, EmptyState, PageHeader, StatRow, StatTile } from '@/features/hr/ui';

export type HistoryRound = { key: string; year: number; label: string; payDate: string; count: number; total: number };

// คอลัมน์ตามดีไซน์ F08
const COLS = 'grid-cols-[minmax(0,1.6fr)_150px_90px_120px_140px]';

export function HistoryClient({
  rounds,
  failures,
  canExport,
  currentYear,
}: {
  rounds: HistoryRound[];
  failures: { year: number; fixed: boolean }[];
  canExport: boolean;
  currentYear: number;
}) {
  const years = [...new Set([currentYear, ...rounds.map((round) => round.year)])].sort((a, b) => b - a);
  const [year, setYear] = useState(String(currentYear));
  const shown = rounds.filter((round) => String(round.year) === year);
  const total = shown.reduce((sum, round) => sum + round.total, 0);
  const count = shown.reduce((sum, round) => sum + round.count, 0);
  const failed = failures.filter((item) => String(item.year) === year);

  return (
    <>
      <PageHeader
        title="ดูข้อมูลย้อนหลัง"
        description="รอบจ่ายที่ปิดแล้ว · กดดูรายการในรอบ"
        actions={
          <>
            <span className="relative inline-flex">
              <select
                aria-label="ปี"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="h-[38px] cursor-pointer appearance-none rounded-full border border-[#CBD5E1] bg-white pr-8 pl-4 text-13 text-ink-soft hover:bg-surface"
              >
                {years.map((item) => (
                  <option key={item} value={String(item)}>
                    ปี {item}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-11 text-ink-soft">
                ▾
              </span>
            </span>
            {canExport ? <ButtonLink href="/payroll/export">Export</ButtonLink> : null}
          </>
        }
      />

      <StatRow>
        <StatTile label="จ่ายแล้วทั้งปี" value={baht(total)} note={`${count} รายการ`} />
        <StatTile label="เฉลี่ยต่อรอบ" value={shown.length > 0 ? baht(Math.round(total / shown.length)) : '—'} note="" />
        <StatTile label="โอนไม่สำเร็จทั้งปี" value={String(failed.length)} note={failed.length === 0 ? '' : failed.every((item) => item.fixed) ? 'แก้แล้ว' : `ยังไม่แก้ ${failed.filter((item) => !item.fixed).length}`} />
      </StatRow>

      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span>รอบ</span>
              <span>วันจ่าย</span>
              <span>รายการ</span>
              <span>ยอดรวม</span>
              <span />
            </div>
            {shown.length === 0 ? (
              <EmptyState>ยังไม่มีรอบจ่ายที่ปิดแล้วในปี {year}</EmptyState>
            ) : (
              shown.map((round) => (
                <div key={round.key} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3', COLS)}>
                  <span className="font-medium">{round.label}</span>
                  <span>{round.payDate}</span>
                  <span className="tabular-nums">{round.count}</span>
                  <span className="font-semibold tabular-nums">{baht(round.total)}</span>
                  <Link href={`/payroll/history/${encodeURIComponent(round.key)}`} className="text-13 text-[#1D4ED8] hover:underline">
                    ดูรายการ ›
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
