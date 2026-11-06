'use client';

import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ExportCsvDialog } from '../../components/ui/ExportCsvDialog';
import { FilterChips } from '../../components/ui/FilterChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { cx } from '../../lib/cx';
import { downloadCsv } from '../../lib/csv';
import type { AuditAction, AuditEntry } from '../../types';
import { LogTable, actionTag, resultLabel } from './LogTable';
import { LOG_SECTIONS, SECTIONS, SECTION_OF, type LogSection } from './sections';

type Filter = 'all' | AuditAction;

const PAGE_SIZE = 20;

const CSV_COLUMNS = ['เลขอ้างอิง', 'วันเวลา', 'ผู้ดำเนินการ', 'บทบาท', 'IP', 'ประเภท', 'ผลลัพธ์', 'ผู้ถูกดำเนินการ', 'รายการ', 'รายละเอียด', 'ก่อน', 'หลัง', 'เหตุผล'];

const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// Layout follows Figma "Admin / Log" (node 163:896). The log is append-only: no edit or delete.
export function LogsPage({ entries, initialSection = 'people' }: { entries: AuditEntry[]; initialSection?: LogSection }) {
  const years = useMemo(
    () => Array.from(new Set(entries.map((entry) => Number(entry.at.slice(0, 4))))).sort((a, b) => b - a),
    [entries],
  );
  const [section, setSection] = useState<LogSection>(initialSection);
  const [year, setYear] = useState(String(years[0] ?? new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Year, month and search narrow the set; tabs and chips then split it (counts follow the narrowed set).
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.at.slice(0, 4) !== year) return false;
      if (month !== 'all' && Number(entry.at.slice(5, 7)) !== Number(month)) return false;
      const target = entry.target ? `${entry.target.code} ${entry.target.name ?? ''}` : '';
      const haystack = `${entry.actor} ${entry.actorRole} ${target} ${entry.importSummary?.file ?? ''} ${entry.title} ${entry.detail} ${entry.ip ?? ''}`;
      return !q || haystack.toLowerCase().includes(q);
    });
  }, [entries, year, month, query]);

  const inSection = (target: LogSection) => scoped.filter((entry) => SECTION_OF[entry.action] === target);
  const sectionEntries = inSection(section);
  const filtered = filter === 'all' ? sectionEntries : sectionEntries.filter((entry) => entry.action === filter);
  const rows = paginate(filtered, page, PAGE_SIZE);
  const hasAnyInSection = entries.some((entry) => SECTION_OF[entry.action] === section);

  const resetPage = () => setPage(1);

  const selectSection = (next: LogSection) => {
    setSection(next);
    setFilter('all');
    resetPage();
    // เก็บแท็บไว้ใน URL ให้ลิงก์/รีเฟรชกลับมาที่แท็บเดิม
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const exportCsv = () =>
    downloadCsv(
      `audit-log-${section}-${year}${month === 'all' ? '' : `-${month.padStart(2, '0')}`}.csv`,
      CSV_COLUMNS,
      filtered.map((entry) => {
        const fields = entry.change?.fields ?? [];
        const side = (pick: 'before' | 'after') => fields.map((f) => `${f.label}: ${f[pick]}`).join(' · ');
        return [
          entry.id,
          entry.at.replace('T', ' '),
          entry.actor,
          entry.actorRole,
          entry.ip ?? '',
          actionTag[entry.action].label,
          resultLabel[entry.result ?? 'success'],
          entry.target ? [entry.target.code, entry.target.name].filter(Boolean).join(' ') : entry.importSummary?.file ?? '',
          entry.title,
          entry.detail,
          side('before'),
          side('after'),
          entry.change?.reason ?? '',
        ];
      }),
    );

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader
        title="ประวัติของระบบ"
        description="บันทึกการเปลี่ยนแปลงทั้งหมดในระบบ ลบหรือแก้ไขย้อนหลังไม่ได้"
      />

      {/* แผ่นเดียว: แถบหมวด, ตัวกรอง, ตาราง อยู่ในกรอบเดียวกัน ไม่แยกเป็นการ์ด */}
      <div className="rounded-[10px] border border-line bg-white">
      <div role="tablist" aria-label="หมวดประวัติ" className="scrollbar-none flex gap-[4px] overflow-x-auto border-b border-line px-[8px] sm:px-[12px]">
        {LOG_SECTIONS.map((id) => {
          const active = id === section;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls="panel-logs"
              onClick={() => selectSection(id)}
              className={cx(
                '-mb-px inline-flex shrink-0 items-center gap-[6px] border-b-2 px-[12px] py-[12px] text-14 sm:px-[18px] whitespace-nowrap transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                active ? 'border-primary-600 font-semibold text-primary-700' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {SECTIONS[id].label}
              <span className="text-12 font-normal tabular-nums text-muted">{inSection(id).length.toLocaleString('th-TH')}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-[16px] p-[16px] sm:p-[20px]">
      <div className="flex flex-col gap-[10px] lg:flex-row">
        <SearchInput
          label="ค้นหา Log"
          placeholder="ค้นหาผู้ดำเนินการ / ผู้ถูกดำเนินการ / กิจกรรม / IP"
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
          <Button onClick={() => setExporting(true)} disabled={filtered.length === 0} className="col-span-2 sm:w-[180px] disabled:opacity-50">
            <FileDown className="size-4" aria-hidden="true" />
            ส่งออก CSV
          </Button>
          <ExportCsvDialog
            open={exporting}
            rowCount={filtered.length}
            unit="บันทึก"
            columns={CSV_COLUMNS}
            personalData="ชื่อผู้ดำเนินการและผู้ถูกแก้ไข, IP address และอีเมลในค่าก่อน/หลัง"
            onCancel={() => setExporting(false)}
            onConfirm={() => {
              exportCsv();
              setExporting(false);
            }}
          />
        </div>
      </div>

      <section
        id="panel-logs"
        role="tabpanel"
        aria-labelledby={`tab-${section}`}
        className="flex flex-col gap-[16px]"
      >
        <FilterChips
          label="กรองตามประเภท"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            resetPage();
          }}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: sectionEntries.length },
            ...SECTIONS[section].filters.map(({ id, label }) => ({
              id,
              label,
              count: sectionEntries.filter((entry) => entry.action === id).length,
            })),
          ]}
        />

        <LogTable
          key={section}
          entries={rows}
          defaultExpandedId={sectionEntries[0]?.id ?? null}
          emptyText={hasAnyInSection ? 'ไม่พบประวัติที่ตรงกับเงื่อนไข' : 'ยังไม่มีประวัติในหมวดนี้'}
        />

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} unit="บันทึก" onChange={setPage} />
      </section>
      </div>
      </div>
    </div>
  );
}
