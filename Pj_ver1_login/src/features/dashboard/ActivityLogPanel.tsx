import Link from 'next/link';
import { Tag } from '../../components/ui/Tag';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import { actionTag, resultTag } from '../logs/LogTable';
import { Region, RegionHeader } from './ui';
import type { AuditEntry } from '../../types';

interface ActivityLogPanelProps {
  className?: string;
  entries: AuditEntry[];
  onViewAll: () => void;
}

// "ประวัติการแก้ไข" บนหน้าแรก – ไม่ใช้ตาราง Log เต็ม (6 คอลัมน์ล้นช่องนี้จนข้อความหักทีละคำ)
// แต่ละรายการเป็นบรรทัดเดียว: เวลา | ประเภท | เรื่อง + เป้าหมาย | ผู้ดำเนินการ แล้วกดทั้งบรรทัดไปดูรายละเอียดที่หน้าประวัติ
export function ActivityLogPanel({ className, entries, onViewAll }: ActivityLogPanelProps) {
  return (
    <Region className={className} aria-labelledby="log-title">
      <RegionHeader
        title="ประวัติการแก้ไข"
        titleId="log-title"
        sub={`${entries.length.toLocaleString('th-TH')} รายการล่าสุด`}
        onViewAll={onViewAll}
      />

      {entries.length === 0 ? (
        <p className="border-t border-line py-[16px] text-13 text-muted">ยังไม่มีประวัติการแก้ไข</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li key={entry.id}>
              <LogLine entry={entry} />
            </li>
          ))}
        </ol>
      )}
    </Region>
  );
}

function LogLine({ entry }: { entry: AuditEntry }) {
  const tag = actionTag[entry.action];
  const failed = entry.result && entry.result !== 'success' ? resultTag[entry.result] : null;
  const target = entry.target ? [entry.target.code, entry.target.name].filter(Boolean).join(' ') : null;

  return (
    <Link
      href="/admin/logs"
      className={cx(
        'grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-[12px] gap-y-[2px] py-[10px] text-13 transition-colors',
        'sm:grid-cols-[6.5rem_7rem_minmax(0,1fr)_auto]',
        'hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-reduce:transition-none',
      )}
    >
      <time dateTime={entry.at} className="whitespace-nowrap text-12 text-muted tabular-nums">
        {formatShortThaiDate(entry.at)} {entry.at.slice(11, 16)}
      </time>
      <span className="hidden sm:flex sm:flex-wrap sm:gap-[4px]">
        <Tag tone={tag.tone}>{tag.label}</Tag>
        {failed ? <Tag tone={failed.tone}>{failed.label}</Tag> : null}
      </span>
      <span className="min-w-0 truncate text-ink">
        {entry.title}
        {target ? <span className="text-muted"> {target}</span> : null}
        {failed ? <span className="text-danger sm:hidden"> ({failed.label})</span> : null}
      </span>
      <span className="col-start-2 truncate text-12 text-muted sm:col-start-auto sm:text-right">{entry.actor}</span>
    </Link>
  );
}
