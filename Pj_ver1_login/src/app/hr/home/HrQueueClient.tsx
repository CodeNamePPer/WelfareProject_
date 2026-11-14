'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { QUEUE_TABS, type QueueRow, type QueueTab } from '@/features/hr/queue';
import { Badge, ButtonLink, FilterPill, Card, EmptyState, PageHeader, RequesterCompact, STATUS_TONE, StatRow, StatTile, Tabs, buttonClass, fieldClass } from '@/features/hr/ui';

export type QueueStat = { label: string; value: string; note: string; warn?: boolean };

// คอลัมน์ตามดีไซน์ H01
const COLS = 'grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_120px_130px]';
const ALL = '';
const PANEL = 'hr-queue-panel';

const hrefOf = (row: QueueRow) => `/hr/home/requests/${encodeURIComponent(row.claimNo)}`;

function RowStatus({ row }: { row: QueueRow }) {
  return <Badge tone={row.action === 'own' ? 'review' : STATUS_TONE[row.status]}>{row.statusLabel}</Badge>;
}

/** ท้ายแถว: ตรวจคำขอ / ตรวจไม่ได้ / รอผู้ขอ (แถวที่ตัดสินแล้วไม่มีปุ่ม กดทั้งแถวเพื่อดู) */
function RowAction({ row, block }: { row: QueueRow; block?: boolean }) {
  if (row.action === 'own') return <span className="text-12 text-muted">ตรวจไม่ได้</span>;
  if (row.action === 'waiting') return <span className="text-12 text-muted">รอผู้ขอ</span>;
  if (row.action !== 'review') return null;
  // ในตาราง ทั้งแถวเป็นลิงก์อยู่แล้ว ปุ่มจึงเป็นแค่หน้าตา (ห้ามซ้อนลิงก์)
  if (!block) return <span className={buttonClass('secondary', 'sm')}>ตรวจคำขอ</span>;
  return (
    <ButtonLink href={hrefOf(row)} variant="secondary" size="sm" className="w-full">
      ตรวจคำขอ
    </ButtonLink>
  );
}

function RequestCell({ row }: { row: QueueRow }) {
  return (
    <span className="block min-w-0">
      <span className="block font-medium">{row.benefitName}</span>
      <span className="block text-12 text-muted">{row.meta}</span>
      <span className={cx('block text-12', row.hint.tone === 'amber' ? 'text-[#92400E]' : 'text-muted')}>{row.hint.text}</span>
    </span>
  );
}

/** แถวตาราง: คำขอของตัวเองเป็นแถวพื้นจางที่กดไม่ได้ แถวอื่นกดได้ทั้งแถว */
function TableRow({ row, children }: { row: QueueRow; children: ReactNode }) {
  const base = cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3.5 text-ink', COLS);
  if (row.action === 'own') {
    return <div className={cx(base, 'bg-[#F8FAFC]')}>{children}</div>;
  }
  return (
    <Link href={hrefOf(row)} className={cx(base, 'no-underline transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none motion-reduce:transition-none')}>
      {children}
    </Link>
  );
}

export function HrQueueClient({ rows, stats, description, initialTab }: { rows: QueueRow[]; stats: QueueStat[]; description: string; initialTab: QueueTab }) {
  const [tab, setTab] = useState<QueueTab>(initialTab);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState(ALL);
  const [benefit, setBenefit] = useState(ALL);
  const [proxy, setProxy] = useState(ALL);

  const changeTab = (next: QueueTab) => {
    setTab(next);
    // จำแท็บไว้ใน URL เพื่อให้กดย้อนกลับจากหน้าตรวจแล้วกลับมาแท็บเดิม
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  const departments = [...new Set(rows.map((row) => row.department))].sort();
  const benefits = [...new Set(rows.map((row) => row.benefitName))].sort();
  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!q || `${row.employeeName} ${row.employeeCode} ${row.claimNo}`.toLowerCase().includes(q)) &&
      (!department || row.department === department) &&
      (!benefit || row.benefitName === benefit) &&
      (!proxy || (proxy === 'proxy' ? row.proxyBy !== null : row.proxyBy === null)),
  );
  const shown = filtered.filter((row) => tab === 'all' || row.tab === tab);
  // ตัวเลขแท็บรอตรวจนับเฉพาะคำขอที่คุณตรวจได้ แท็บทั้งหมดไม่มีตัวเลข (ตามดีไซน์)
  const tabs = QUEUE_TABS.map((item) => ({
    ...item,
    count: item.id === 'all' ? null : filtered.filter((row) => row.tab === item.id && (item.id !== 'pending' || row.action !== 'own')).length,
  }));
  const tabLabel = QUEUE_TABS.find((item) => item.id === tab)?.label ?? '';
  const person = (row: QueueRow) => ({ name: row.employeeName, code: row.employeeCode, position: row.position, department: row.department, proxyBy: row.proxyBy });

  return (
    <>
      <PageHeader title="คิวคำขอสวัสดิการ" description={description} />

      <StatRow>
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} note={stat.note} tone={stat.warn ? 'warn' : 'default'} />
        ))}
      </StatRow>

      <Card>
        <Tabs label="สถานะคำขอ" items={tabs} value={tab} onChange={changeTab} panelId={PANEL} />
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <input
            type="search"
            aria-label="ค้นหา"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อ รหัสพนักงาน เลขคำขอ"
            className={cx(fieldClass, '!h-9 w-full sm:!w-[280px]')}
          />
          <FilterPill label="แผนก" value={department} onChange={setDepartment}>
            {departments.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </FilterPill>
          <FilterPill label="สวัสดิการ" value={benefit} onChange={setBenefit}>
            {benefits.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </FilterPill>
          <FilterPill label="ยื่นแทน" value={proxy} onChange={setProxy}>
            <option value="proxy">เฉพาะยื่นแทน</option>
            <option value="self">เฉพาะยื่นเอง</option>
          </FilterPill>
        </div>

        <div id={PANEL} role="tabpanel" aria-label={tabLabel}>
          {shown.length === 0 ? (
            <EmptyState>{rows.length === 0 ? 'ยังไม่มีคำขอ' : filtered.length === rows.length ? `ไม่มีคำขอในแท็บ${tabLabel}` : 'ไม่มีคำขอในแท็บนี้ที่ตรงกับตัวกรอง'}</EmptyState>
          ) : (
            <>
              {/* จอกว้าง: ตาราง (ดีไซน์ H01) */}
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[900px]">
                  <div className={cx('grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                    <span>ผู้ขอ</span>
                    <span>คำขอ</span>
                    <span className="text-right">จำนวนเงิน</span>
                    <span>สถานะ</span>
                    <span />
                  </div>
                  {shown.map((row) => (
                    <TableRow key={row.claimNo} row={row}>
                      <RequesterCompact person={person(row)} />
                      <RequestCell row={row} />
                      <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                      <span>
                        <RowStatus row={row} />
                      </span>
                      <span className="text-right">
                        <RowAction row={row} />
                      </span>
                    </TableRow>
                  ))}
                </div>
              </div>

              {/* มือถือ (ไม่มี artboard ของ HR): แถวเดียวกันเรียงเป็นการ์ด */}
              <ul className="m-0 list-none p-0 md:hidden">
                {shown.map((row) => (
                  <li key={row.claimNo} className={cx('border-t border-[#F1F5F9]', row.action === 'own' && 'bg-[#F8FAFC]')}>
                    {(() => {
                      const body = (
                        <>
                          <RequesterCompact person={person(row)} />
                          <RequestCell row={row} />
                          <span className="flex items-center justify-between gap-3">
                            <RowStatus row={row} />
                            <span className="font-semibold tabular-nums">{baht(row.amount)}</span>
                          </span>
                        </>
                      );
                      return row.action === 'own' || row.action === 'review' ? (
                        <div className="flex flex-col gap-2.5 px-4 py-3.5">
                          {body}
                          {row.action === 'review' ? <RowAction row={row} block /> : <span className="text-right"><RowAction row={row} /></span>}
                        </div>
                      ) : (
                        <Link href={hrefOf(row)} className="flex flex-col gap-2.5 px-4 py-3.5 text-ink no-underline hover:bg-surface">
                          {body}
                          {row.action === 'waiting' ? <span className="text-right"><RowAction row={row} /></span> : null}
                        </Link>
                      );
                    })()}
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
