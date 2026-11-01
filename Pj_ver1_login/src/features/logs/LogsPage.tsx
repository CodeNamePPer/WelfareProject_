'use client';

import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FilterChips } from '../../components/ui/FilterChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { downloadCsv } from '../../lib/csv';
import type { AuditCategory, AuditEntry } from '../../types';
import { LogTable, actionTag } from './LogTable';

type Filter = 'all' | AuditCategory;

const PAGE_SIZE = 6;

const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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

        <LogTable entries={rows} defaultExpandedId={entries[0]?.id ?? null} />

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} unit="บันทึก" onChange={setPage} />
      </section>
    </div>
  );
}
