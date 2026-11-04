'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FilterChips } from '../../components/ui/FilterChips';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { LogTable } from '../logs/LogTable';
import type { AuditEntry } from '../../types';

type Filter = 'all' | 'welfare' | 'import';

const PAGE_SIZE = 10;

const isImport = (entry: AuditEntry) => entry.category === 'import';

// Welfare-related entries from the audit log, shown with the same table as /admin/logs.
export function HistoryTab({ entries }: { entries: AuditEntry[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      `${entry.actor} ${entry.target?.code ?? ''} ${entry.target?.name ?? ''} ${entry.title} ${entry.detail} ${entry.importSummary?.file ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [entries, query]);

  const filtered = filter === 'all' ? scoped : scoped.filter((entry) => (filter === 'import' ? isImport(entry) : !isImport(entry)));
  const importCount = scoped.filter(isImport).length;

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-17 font-semibold text-ink">
            ประวัติการแก้ไขสวัสดิการ
          </h2>
          <p className="mt-[4px] text-12 text-muted">การเพิ่ม แก้ไข ปิดใช้ และนำเข้าข้อมูลสวัสดิการ</p>
        </div>
        <Link href="/admin/logs" className="shrink-0 text-13 font-medium text-primary-700 hover:underline">
          ดู Log ทั้งหมด
        </Link>
      </header>

      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-end lg:justify-between">
        <FilterChips
          label="กรองตามประเภท"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: scoped.length },
            { id: 'welfare', label: 'แก้ไขสวัสดิการ', count: scoped.length - importCount },
            { id: 'import', label: 'นำเข้าข้อมูล', count: importCount },
          ]}
        />
        <SearchInput
          label="ค้นหาประวัติ"
          placeholder="ค้นหารหัส / ชื่อสวัสดิการ / ผู้ดำเนินการ / ไฟล์"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="lg:w-[340px]"
        />
      </div>

      <LogTable
        entries={paginate(filtered, page, PAGE_SIZE)}
        emptyText={entries.length === 0 ? 'ยังไม่มีประวัติ' : 'ไม่พบประวัติที่ตรงกับเงื่อนไข'}
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} unit="รายการ" onChange={setPage} />
    </section>
  );
}
