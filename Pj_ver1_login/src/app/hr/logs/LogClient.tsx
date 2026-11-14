'use client';

import { useState } from 'react';
import { downloadCsv } from '@/lib/csv';
import { cx } from '@/lib/cx';
import type { HrLogCategory, HrLogEntry } from '@/lib/hr/logs';
import { Button, Card, EmptyState, PageHeader, Tabs } from '@/features/hr/ui';

type LogTab = 'all' | HrLogCategory;

// แท็บตามดีไซน์ H08
const TABS: { id: LogTab; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'claim', label: 'คำขอเบิก' },
  { id: 'employee', label: 'ข้อมูลพนักงาน' },
  { id: 'limit', label: 'วงเงิน' },
  { id: 'benefit', label: 'สวัสดิการ' },
];

const COLS = 'grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,2.4fr)]';
const PANEL = 'hr-log-panel';
const TZ = 'Asia/Bangkok';

/** 13 พ.ย. 10:24 */
const timeOf = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: TZ })} ${date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })}`;
};

export function LogClient({ entries }: { entries: HrLogEntry[] }) {
  const [tab, setTab] = useState<LogTab>('all');
  const shown = entries.filter((entry) => tab === 'all' || entry.category === tab);
  const tabLabel = TABS.find((item) => item.id === tab)?.label ?? '';

  const exportCsv = () =>
    downloadCsv(
      'hr-log.csv',
      ['เวลา', 'การกระทำ', 'รายการ', 'ก่อน → หลัง'],
      shown.map((entry) => [timeOf(entry.at), entry.action, entry.item, entry.detail]),
    );

  return (
    <>
      <PageHeader
        title="ประวัติการแก้ไข"
        description="การกระทำของ HR ทั้งหมด ค่าก่อนและหลังแก้ไข · แก้ไขหรือลบไม่ได้"
        actions={
          <Button variant="quiet" className="!px-4" onClick={exportCsv} disabled={shown.length === 0}>
            Export
          </Button>
        }
      />
      <Card>
        <Tabs label="ประเภทรายการ" items={TABS} value={tab} onChange={setTab} panelId={PANEL} />
        <div id={PANEL} role="tabpanel" aria-label={tabLabel}>
          {shown.length === 0 ? (
            <EmptyState>{entries.length === 0 ? 'ยังไม่มีประวัติ' : `ยังไม่มีประวัติในแท็บ${tabLabel}`}</EmptyState>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[860px]">
                  <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                    <span>เวลา</span>
                    <span>การกระทำ</span>
                    <span>รายการ</span>
                    <span>ก่อน → หลัง</span>
                  </div>
                  {shown.map((entry) => (
                    <div key={entry.id} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3 text-13', COLS)}>
                      <span className="text-muted">{timeOf(entry.at)}</span>
                      <span className="font-medium">{entry.action}</span>
                      <span className="break-words">{entry.item}</span>
                      <span className="break-words text-ink-soft">{entry.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* มือถือ: แถวเดียวกันเรียงลงมา */}
              <ul className="m-0 list-none p-0 md:hidden">
                {shown.map((entry) => (
                  <li key={entry.id} className="border-t border-[#F1F5F9] px-4 py-3 text-13 first:border-t-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{entry.action}</span>
                      <span className="shrink-0 text-12 text-muted">{timeOf(entry.at)}</span>
                    </span>
                    <span className="block break-words">{entry.item}</span>
                    <span className="block break-words text-ink-soft">{entry.detail}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Card>
    </>
  );
}
