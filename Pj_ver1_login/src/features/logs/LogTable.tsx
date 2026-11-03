'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { Tag } from '../../components/ui/Tag';
import type { TagTone } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import type { AuditAction, AuditEntry } from '../../types';

export const actionTag: Record<AuditAction, { label: string; tone: TagTone }> = {
  'role-change': { label: 'เปลี่ยนบทบาท', tone: 'outline' },
  welfare: { label: 'สวัสดิการ', tone: 'info' },
  'user-update': { label: 'แก้ไขผู้ใช้', tone: 'outline' },
  security: { label: 'ความปลอดภัย', tone: 'danger' },
  system: { label: 'ระบบ', tone: 'warning' },
  import: { label: 'นำเข้าข้อมูล', tone: 'success' },
};

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

interface LogTableProps {
  entries: AuditEntry[];
  /** Row whose change details start open. */
  defaultExpandedId?: string | null;
  emptyText?: string;
}

// Log table from Figma "Admin / Log" (node 163:896), shared by the Log page and the dashboard.
// ประเภทอยู่ถัดจากเวลา ให้สแกนหาแท็กได้ทางซ้าย ส่วนปุ่มดูรายละเอียดอยู่คอลัมน์ขวาสุด ตำแหน่งเดียวกับปุ่มคำสั่งของแถวในตารางอื่น
export function LogTable({ entries, defaultExpandedId = null, emptyText = 'ไม่พบ Log ที่ตรงกับเงื่อนไข' }: LogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId);

  return (
    <div className={table.wrapper}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col" className={cx(table.th, 'w-[90px]')}>เวลา</th>
            <th scope="col" className={cx(table.th, 'w-[200px]')}>ประเภท</th>
            <th scope="col" className={cx(table.th, 'w-[190px]')}>ผู้ดำเนินการ</th>
            <th scope="col" className={cx(table.th, 'w-full')}>รายละเอียด</th>
            <th scope="col" className={table.th}>
              <span className="sr-only">การเปลี่ยนแปลง</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={5} className={cx(table.td, 'py-[40px] text-center text-muted')}>
                {emptyText}
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const expanded = expandedId === entry.id;
              const tag = actionTag[entry.action];
              return (
                <Fragment key={entry.id}>
                  <tr className={cx(table.row, expanded ? 'bg-surface' : table.rowHover)}>
                    <td className={cx(table.td, 'whitespace-nowrap text-12 text-muted tabular-nums', expanded && 'border-b-0')}>
                      <time dateTime={entry.at}>
                        {formatShortThaiDate(entry.at)}
                        <br />
                        {timeOf(entry.at)}
                      </time>
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap', expanded && 'border-b-0')}>
                      <Tag tone={tag.tone}>{tag.label}</Tag>
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap', expanded && 'border-b-0')}>
                      <div className="flex items-center gap-[8px]">
                        <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[4px] bg-surface text-muted ring-1 ring-line" aria-hidden="true">
                          <UserRound className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{entry.actor}</p>
                          <p className="text-11 text-muted">{entry.actorRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cx(table.td, expanded && 'border-b-0')}>
                      <p>{entry.title}</p>
                      <p className="text-12 text-muted">{entry.detail}</p>
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap text-right', expanded && 'border-b-0')}>
                      {entry.change ? (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          aria-expanded={expanded}
                          aria-controls={`log-detail-${entry.id}`}
                          className="inline-flex h-[30px] items-center gap-[4px] rounded-[6px] border border-primary-600/40 bg-white px-[10px] text-12 font-medium text-primary-700 transition-colors hover:border-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
                        >
                          {expanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                          <ChevronDown className={cx('size-3.5 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {expanded && entry.change ? (
                    <tr id={`log-detail-${entry.id}`}>
                      <td colSpan={5} className={cx(table.td, 'border-b-ink/60 pt-[4px]')}>
                        <p className="text-12 text-muted">รายละเอียดการเปลี่ยนแปลง</p>
                        <div className="mt-[10px] grid max-w-[460px] grid-cols-2 gap-[8px]">
                          <ChangeBox label="ก่อน" value={entry.change.before} />
                          <ChangeBox label="หลัง" value={entry.change.after} highlight />
                        </div>
                        {entry.change.reason ? (
                          <p className="mt-[12px] text-12 text-muted">เหตุผล: {entry.change.reason}</p>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChangeBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cx('flex min-h-[80px] flex-col gap-[8px] rounded-[6px] border bg-white p-[12px]', highlight ? 'border-primary-500' : 'border-line')}>
      <p className="text-12 text-muted">{label}</p>
      <p className="text-13 font-medium text-ink">{value}</p>
    </div>
  );
}
