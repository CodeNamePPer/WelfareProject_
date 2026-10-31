'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, FileDown, UserRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FilterChips } from '../../components/ui/FilterChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Tag } from '../../components/ui/Tag';
import type { TagTone } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { downloadCsv } from '../../lib/csv';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import type { AuditAction, AuditCategory, AuditEntry } from '../../types';

type Filter = 'all' | AuditCategory;

const PAGE_SIZE = 6;

const actionTag: Record<AuditAction, { label: string; tone: TagTone }> = {
  'role-change': { label: 'เปลี่ยนบทบาท', tone: 'outline' },
  welfare: { label: 'สวัสดิการ', tone: 'info' },
  'user-update': { label: 'แก้ไขผู้ใช้', tone: 'outline' },
  security: { label: 'ความปลอดภัย', tone: 'danger' },
  system: { label: 'ระบบ', tone: 'warning' },
  import: { label: 'นำเข้าข้อมูล', tone: 'success' },
};

const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

// Layout follows Figma "Admin / Log" (node 163:896). The log is append-only: no edit or delete.
export function LogsPage({ entries }: { entries: AuditEntry[] }) {
  const years = useMemo(
    () => Array.from(new Set(entries.map((entry) => Number(entry.at.slice(0, 4))))).sort((a, b) => b - a),
    [entries],
  );
  const [year, setYear] = useState(String(years[0] ?? new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(entries[0]?.id ?? null);

  // Year, month and search narrow the set; the chips then split it by category (counts follow the narrowed set).
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.at.slice(0, 4) !== year) return false;
      if (month !== 'all' && Number(entry.at.slice(5, 7)) !== Number(month)) return false;
      return !q || `${entry.actor} ${entry.actorRole} ${entry.title} ${entry.detail}`.toLowerCase().includes(q);
    });
  }, [entries, year, month, query]);

  const filtered = filter === 'all' ? scoped : scoped.filter((entry) => entry.category === filter);
  const rows = paginate(filtered, page, PAGE_SIZE);
  const count = (category: AuditCategory) => scoped.filter((entry) => entry.category === category).length;

  const resetPage = () => setPage(1);

  const exportCsv = () =>
    downloadCsv(
      `audit-log-${year}${month === 'all' ? '' : `-${month.padStart(2, '0')}`}.csv`,
      ['วันเวลา', 'ผู้ดำเนินการ', 'บทบาท', 'รายการ', 'รายละเอียด', 'ประเภท', 'ก่อน', 'หลัง', 'เหตุผล'],
      filtered.map((entry) => [
        entry.at.replace('T', ' '),
        entry.actor,
        entry.actorRole,
        entry.title,
        entry.detail,
        actionTag[entry.action].label,
        entry.change?.before ?? '',
        entry.change?.after ?? '',
        entry.change?.reason ?? '',
      ]),
    );

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader
        title="ประวัติการแก้ไข Log"
        description="บันทึกการเปลี่ยนแปลงระบบ · Admin จัดการระบบได้ แต่ไม่สามารถอนุมัติคำขอเบิก · ลบหรือแก้ไขไม่ได้"
      />

      <div className="flex flex-col gap-[10px] lg:flex-row">
        <SearchInput
          label="ค้นหา Log"
          placeholder="ค้นหาชื่อผู้ใช้ / กิจกรรม / อีเมล IT"
          value={query}
          onChange={(value) => {
            setQuery(value);
            resetPage();
          }}
          className="flex-1"
        />
        <div className="grid grid-cols-2 gap-[10px] sm:flex">
          <Select
            label="ปี"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              resetPage();
            }}
            wrapperClassName="sm:w-[110px]"
          >
            {years.map((value) => (
              <option key={value} value={value}>
                ปี {value + 543}
              </option>
            ))}
          </Select>
          <Select
            label="เดือน"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              resetPage();
            }}
            wrapperClassName="sm:w-[170px]"
          >
            <option value="all">ทุกเดือน</option>
            {months.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </Select>
          <Button onClick={exportCsv} disabled={filtered.length === 0} className="col-span-2 sm:w-[180px] disabled:opacity-50">
            <FileDown className="size-4" aria-hidden="true" />
            ส่งออก CSV
          </Button>
        </div>
      </div>

      <section aria-label="รายการ Log" className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
        <FilterChips
          label="กรองตามประเภท"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            resetPage();
          }}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: scoped.length },
            { id: 'settings', label: 'การตั้งค่าระบบ', count: count('settings') },
            { id: 'import', label: 'การนำเข้าข้อมูล', count: count('import') },
            { id: 'issue', label: 'แจ้งปัญหาเว็บไซต์', count: count('issue') },
          ]}
        />

        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={cx(table.th, 'w-[90px]')}>เวลา</th>
                <th scope="col" className={cx(table.th, 'w-[170px]')}>ผู้ดำเนินการ</th>
                <th scope="col" className={table.th}>รายละเอียด</th>
                <th scope="col" className={cx(table.th, 'w-[250px]')}>ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className={cx(table.td, 'py-[40px] text-center text-muted')}>
                    ไม่พบ Log ที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const expanded = expandedId === entry.id;
                  const tag = actionTag[entry.action];
                  return (
                    <Fragment key={entry.id}>
                      <tr className={cx(table.row, expanded ? 'bg-surface' : table.rowHover)}>
                        <td className={cx(table.td, 'text-[12px] text-muted tabular-nums', expanded && 'border-b-0')}>
                          <time dateTime={entry.at}>
                            {formatShortThaiDate(entry.at)}
                            <br />
                            {timeOf(entry.at)}
                          </time>
                        </td>
                        <td className={cx(table.td, expanded && 'border-b-0')}>
                          <div className="flex items-center gap-[8px]">
                            <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[4px] bg-surface text-muted ring-1 ring-line" aria-hidden="true">
                              <UserRound className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{entry.actor}</p>
                              <p className="text-[11px] text-muted">{entry.actorRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cx(table.td, expanded && 'border-b-0')}>
                          <p>{entry.title}</p>
                          <p className="text-[12px] text-muted">{entry.detail}</p>
                        </td>
                        <td className={cx(table.td, expanded && 'border-b-0')}>
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <Tag tone={tag.tone}>{tag.label}</Tag>
                            {entry.change ? (
                              <button
                                type="button"
                                onClick={() => setExpandedId(expanded ? null : entry.id)}
                                aria-expanded={expanded}
                                aria-controls={`log-detail-${entry.id}`}
                                className="inline-flex h-[26px] items-center gap-[4px] rounded-[4px] border border-line bg-white px-[8px] text-[12px] text-ink hover:border-primary-500 hover:bg-primary-50"
                              >
                                รายละเอียด
                                <ChevronDown className={cx('size-3.5 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded && entry.change ? (
                        <tr id={`log-detail-${entry.id}`}>
                          <td colSpan={4} className={cx(table.td, 'border-b-ink/60 pt-[4px]')}>
                            <p className="text-[12px] text-muted">รายละเอียดการเปลี่ยนแปลง</p>
                            <div className="mt-[10px] grid max-w-[460px] grid-cols-2 gap-[8px]">
                              <ChangeBox label="ก่อน" value={entry.change.before} />
                              <ChangeBox label="หลัง" value={entry.change.after} highlight />
                            </div>
                            {entry.change.reason ? (
                              <p className="mt-[12px] text-[12px] text-muted">เหตุผล: {entry.change.reason}</p>
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

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} unit="บันทึก" onChange={setPage} />
      </section>
    </div>
  );
}

function ChangeBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cx('flex min-h-[80px] flex-col gap-[8px] rounded-[6px] border bg-white p-[12px]', highlight ? 'border-primary-500' : 'border-line')}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}
