'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, UserRound } from 'lucide-react';
import { Tag } from '../../components/ui/Tag';
import type { TagTone } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import type { AuditAction, AuditEntry, AuditResult, AuditTarget } from '../../types';

export const actionTag: Record<AuditAction, { label: string; tone: TagTone }> = {
  'role-change': { label: 'เปลี่ยนบทบาท', tone: 'outline' },
  welfare: { label: 'สวัสดิการ', tone: 'info' },
  'user-update': { label: 'แก้ไขผู้ใช้', tone: 'outline' },
  security: { label: 'ความปลอดภัย', tone: 'danger' },
  system: { label: 'ระบบ', tone: 'warning' },
  import: { label: 'นำเข้าข้อมูล', tone: 'success' },
};

/** สำเร็จไม่ต้องติดแท็ก ให้แถวที่ผิดปกติเด่นขึ้นมา */
export const resultTag: Record<Exclude<AuditResult, 'success'>, { label: string; tone: TagTone }> = {
  failed: { label: 'ไม่สำเร็จ', tone: 'danger' },
  partial: { label: 'สำเร็จบางส่วน', tone: 'warning' },
};

export const resultLabel: Record<AuditResult, string> = { success: 'สำเร็จ', failed: 'ไม่สำเร็จ', partial: 'สำเร็จบางส่วน' };

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

/** การนำเข้าไม่มีเป้าหมายเป็นคน/สวัสดิการ ใช้ชื่อไฟล์แทน */
const targetOf = (entry: AuditEntry): AuditTarget | undefined =>
  entry.target ?? (entry.importSummary ? { code: entry.importSummary.file, name: `${entry.importSummary.total.toLocaleString('th-TH')} รายการ` } : undefined);

const hasDetail = (entry: AuditEntry) => Boolean(entry.change || entry.importSummary || entry.ip);

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

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <>
    <div className={table.wrapper}>
      <table className={table.table}>
        <thead>
          <tr>
            <th scope="col" className={cx(table.th, 'w-[90px]')}>เวลา</th>
            <th scope="col" className={cx(table.th, 'w-[150px]')}>ประเภท</th>
            <th scope="col" className={cx(table.th, 'w-[190px]')}>ผู้ดำเนินการ</th>
            <th scope="col" className={cx(table.th, 'min-w-[190px]')}>ผู้ถูกดำเนินการ</th>
            <th scope="col" className={cx(table.th, 'w-full')}>รายละเอียด</th>
            <th scope="col" className={table.th}>
              <span className="sr-only">การเปลี่ยนแปลง</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className={cx(table.td, 'py-[40px] text-center text-muted')}>
                {emptyText}
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const expanded = expandedId === entry.id && hasDetail(entry);
              const tag = actionTag[entry.action];
              const td = (extra?: string) => cx(table.td, extra, expanded && 'border-b-0');
              return (
                <Fragment key={entry.id}>
                  <tr className={cx(table.row, expanded ? 'bg-surface' : table.rowHover)}>
                    <td className={td('whitespace-nowrap text-12 text-muted tabular-nums')}>
                      <time dateTime={entry.at}>
                        {formatShortThaiDate(entry.at)}
                        <br />
                        {timeOf(entry.at)}
                      </time>
                    </td>
                    <td className={td('whitespace-nowrap')}>
                      <div className="flex flex-col items-start gap-[4px]">
                        <Tag tone={tag.tone}>{tag.label}</Tag>
                        <ResultTag result={entry.result} />
                      </div>
                    </td>
                    <td className={td('whitespace-nowrap')}>
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
                    <td className={td()}>
                      <TargetCell target={targetOf(entry)} />
                    </td>
                    <td className={td()}>
                      <p>{entry.title}</p>
                      {entry.detail ? <p className="text-12 text-muted">{entry.detail}</p> : null}
                    </td>
                    <td className={td('whitespace-nowrap text-right')}>
                      {hasDetail(entry) ? (
                        <DetailToggle expanded={expanded} controls={`log-detail-${entry.id}`} onClick={() => toggle(entry.id)} />
                      ) : null}
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`log-detail-${entry.id}`}>
                      <td colSpan={6} className={cx(table.td, 'border-b-ink/60 pt-[4px]')}>
                        <EntryDetail entry={entry} />
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

    {entries.length === 0 ? (
      <p className={table.cardEmpty}>{emptyText}</p>
    ) : (
      <ul className={table.cards}>
        {entries.map((entry) => {
          const expanded = expandedId === entry.id && hasDetail(entry);
          const tag = actionTag[entry.action];
          return (
            <li key={entry.id} className={cx(table.card, expanded && 'bg-surface')}>
              <div className="flex items-center justify-between gap-[8px]">
                <div className="flex flex-wrap gap-[4px]">
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                  <ResultTag result={entry.result} />
                </div>
                <time dateTime={entry.at} className="shrink-0 text-11 text-muted tabular-nums">
                  {formatShortThaiDate(entry.at)} {timeOf(entry.at)}
                </time>
              </div>
              <p className="mt-[8px] break-words">{entry.title}</p>
              {targetOf(entry) ? (
                <div className="mt-[2px] text-12">
                  <TargetCell target={targetOf(entry)} inline />
                </div>
              ) : null}
              {entry.detail ? <p className="break-words text-12 text-muted">{entry.detail}</p> : null}
              <p className="mt-[6px] truncate text-12 text-muted">
                <span className="font-semibold text-ink">{entry.actor}</span> · {entry.actorRole}
              </p>
              {hasDetail(entry) ? (
                <>
                  <div className="mt-[10px]">
                    <DetailToggle expanded={expanded} controls={`log-card-detail-${entry.id}`} onClick={() => toggle(entry.id)} />
                  </div>
                  {expanded ? (
                    <div id={`log-card-detail-${entry.id}`} className="mt-[10px]">
                      <EntryDetail entry={entry} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    )}
    </>
  );
}

function ResultTag({ result }: { result?: AuditResult }) {
  if (!result || result === 'success') return null;
  const tag = resultTag[result];
  return <Tag tone={tag.tone}>{tag.label}</Tag>;
}

function TargetCell({ target, inline }: { target?: AuditTarget; inline?: boolean }) {
  if (!target) return <span className="text-muted">—</span>;
  const code = target.href ? (
    <Link href={target.href} className="font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
      {target.code}
    </Link>
  ) : (
    <span className="font-medium">{target.code}</span>
  );
  if (inline) {
    return (
      <p className="break-words">
        {code}
        {target.name ? <span className="text-muted"> · {target.name}</span> : null}
      </p>
    );
  }
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap">{code}</p>
      {target.name ? <p className="text-12 text-muted">{target.name}</p> : null}
    </div>
  );
}

function DetailToggle({ expanded, controls, onClick }: { expanded: boolean; controls: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className="inline-flex h-[30px] items-center gap-[4px] rounded-[6px] border border-primary-600/40 bg-white px-[10px] text-12 font-medium text-primary-700 transition-colors hover:border-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
    >
      {expanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
      <ChevronDown className={cx('size-3.5 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
    </button>
  );
}

function EntryDetail({ entry }: { entry: AuditEntry }) {
  const { change, importSummary } = entry;
  return (
    <div className="flex flex-col gap-[12px]">
      {change && change.fields.length > 0 ? (
        <div>
          <p className="text-12 text-muted">รายละเอียดการเปลี่ยนแปลง</p>
          <div className="mt-[8px] max-w-[640px] overflow-hidden rounded-[6px] border border-line bg-white">
            {/* จอเล็ก: ชื่อฟิลด์อยู่บรรทัดบน ก่อน/หลังเรียงคู่กันด้านล่าง */}
            <div className="hidden grid-cols-[minmax(90px,140px)_1fr_1fr] gap-x-[12px] border-b border-line bg-surface px-[12px] py-[8px] text-12 text-muted sm:grid">
              <span>ฟิลด์</span>
              <span>ก่อน</span>
              <span>หลัง</span>
            </div>
            {change.fields.map((field) => (
              <div key={field.label} className="grid grid-cols-2 gap-x-[12px] gap-y-[4px] border-b border-line px-[12px] py-[10px] text-13 last:border-b-0 sm:grid-cols-[minmax(90px,140px)_1fr_1fr]">
                <span className="col-span-2 font-medium text-muted sm:col-span-1 sm:font-normal">{field.label}</span>
                <span className="break-words text-muted">
                  <span className="block text-11 sm:hidden">ก่อน</span>
                  {field.before}
                </span>
                <span className="break-words font-medium text-ink">
                  <span className="block text-11 font-normal text-muted sm:hidden">หลัง</span>
                  {field.after}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {change?.reason ? <p className="text-12 text-muted">เหตุผล: <span className="text-ink">{change.reason}</span></p> : null}

      {importSummary ? (
        <div>
          <p className="text-12 text-muted">ผลการนำเข้า</p>
          <dl className="mt-[8px] grid max-w-[640px] grid-cols-2 gap-[8px] sm:grid-cols-4">
            <SummaryBox label="ไฟล์" value={importSummary.file} />
            <SummaryBox label="ทั้งหมด" value={`${importSummary.total.toLocaleString('th-TH')} รายการ`} />
            <SummaryBox label="สำเร็จ" value={importSummary.success.toLocaleString('th-TH')} tone="success" />
            <SummaryBox label="ไม่สำเร็จ" value={importSummary.failed.toLocaleString('th-TH')} tone={importSummary.failed > 0 ? 'danger' : undefined} />
          </dl>
        </div>
      ) : null}

      <p className="text-11 text-muted tabular-nums">
        เลขอ้างอิง #{entry.id}
        {entry.ip ? ` · IP ${entry.ip}` : null}
      </p>
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="flex flex-col gap-[4px] rounded-[6px] border border-line bg-white p-[10px]">
      <dt className="text-12 text-muted">{label}</dt>
      <dd className={cx('break-words text-13 font-medium tabular-nums', tone === 'success' && 'text-status-approved-ink', tone === 'danger' && 'text-status-rejected-ink', !tone && 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}
