'use client';

import { useState } from 'react';
import { csvDateTime, downloadCsv } from '@/lib/csv';
import { cx } from '@/lib/cx';
import type { HrLogCategory, HrLogEntry } from '@/lib/hr/logs';
import { Button, Card, EmptyState, PageHeader, Tabs } from '@/features/hr/ui';

/** แถวของตารางประวัติ: HR ใช้หมวดของ HR ส่วน Admin ใช้หมวดของ Admin (ข้อมูลพนักงาน / สวัสดิการ / ระบบ) */
export type LogRow = Omit<HrLogEntry, 'category'> & { category: string; /** ผู้ดำเนินการ (หน้า Admin) */ by?: string };
export type LogTabDef = { id: string; label: string };

// แท็บตามดีไซน์ H08
const HR_TABS: { id: 'all' | HrLogCategory; label: string }[] = [
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

// H08 ประวัติการแก้ไข · หน้าประวัติของระบบของ Admin ใช้โครงเดียวกัน ส่งแท็บ หัวข้อ และชื่อไฟล์ของตัวเองมา
export function LogClient({
  entries,
  tabs = HR_TABS,
  initialTab = 'all',
  title = 'ประวัติการแก้ไข',
  description,
  csvName = 'hr-log.csv',
  exportUrl,
}: {
  entries: LogRow[];
  tabs?: LogTabDef[];
  initialTab?: string;
  title?: string;
  description?: string;
  csvName?: string;
  /** หน้าแสดงแค่รายการล่าสุด – ถ้ามี Export จะดึงประวัติทั้งหมด ({ rows: LogRow[] }) จาก URL นี้ */
  exportUrl?: string;
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const shown = entries.filter((entry) => tab === 'all' || entry.category === tab);
  const tabLabel = tabs.find((item) => item.id === tab)?.label ?? '';

  const writeCsv = (rows: LogRow[]) => {
    const withActor = rows.some((entry) => entry.by);
    downloadCsv(
      csvName,
      ['เวลา', 'การกระทำ', ...(withActor ? ['ผู้ดำเนินการ'] : []), 'รายการ', 'ก่อน → หลัง'],
      rows.map((entry) => [csvDateTime(entry.at), entry.action, ...(withActor ? [entry.by ?? ''] : []), entry.item, entry.detail]),
    );
  };

  const exportCsv = async () => {
    if (!exportUrl) return writeCsv(shown);
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(exportUrl, { cache: 'no-store' });
      const body = (await res.json().catch(() => null)) as { rows?: LogRow[]; error?: string } | null;
      if (!res.ok || !body?.rows) throw new Error(body?.error ?? 'ส่งออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      writeCsv(body.rows.filter((entry) => tab === 'all' || entry.category === tab));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'ส่งออกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button variant="quiet" className="!px-4" onClick={exportCsv} disabled={shown.length === 0 || exporting}>
              {exporting ? 'กำลังส่งออก…' : 'Export'}
            </Button>
            {exportError ? (
              <p role="alert" className="text-12 text-danger">
                {exportError}
              </p>
            ) : null}
          </div>
        }
      />
      <Card>
        <Tabs label="ประเภทรายการ" items={tabs} value={tab} onChange={setTab} panelId={PANEL} />
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
                      <span className="min-w-0">
                        <span className="block font-medium">{entry.action}</span>
                        {entry.by ? <span className="block break-words text-12 text-muted">โดย {entry.by}</span> : null}
                      </span>
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
                    {entry.by ? <span className="block break-words text-12 text-muted">โดย {entry.by}</span> : null}
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
