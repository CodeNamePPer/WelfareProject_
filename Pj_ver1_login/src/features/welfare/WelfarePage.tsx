'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { cx } from '../../lib/cx';
import { formatBahtWhole } from '../../lib/format';
import type { Claim, Employee, ImportRecord, WelfareItem } from '../../types';
import { ClaimsTab } from './ClaimsTab';
import { ImportPanel } from './ImportPanel';
import { WelfareCatalog } from './WelfareCatalog';

export type TabId = 'catalog' | 'claims' | 'import';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'catalog', label: 'สวัสดิการที่มีอยู่' },
  { id: 'claims', label: 'คำขอเบิก' },
  { id: 'import', label: 'นำเข้าประวัติ' },
];

interface WelfarePageProps {
  initialItems: WelfareItem[];
  importPreview: ImportRecord[];
  claims: Claim[];
  employees: Employee[];
  /** Tab to open first, e.g. from a dashboard shortcut (?tab=import). */
  initialTab?: TabId;
  /** Open the "new welfare" form right away (?new=1 from the shortcut menu). */
  startCreating?: boolean;
}

// Layout follows Figma "Admin / จัดการสวัสดิการและนำเข้าประวัติ" (node 163:180).
export function WelfarePage({ initialItems, importPreview, claims, employees, initialTab = 'catalog', startCreating = false }: WelfarePageProps) {
  const [tab, setTab] = useState<TabId>(initialTab);
  // The shortcut can fire while this page is already open on the claims tab; the new-item form lives in the catalog.
  const [prevStartCreating, setPrevStartCreating] = useState(startCreating);
  if (startCreating !== prevStartCreating) {
    setPrevStartCreating(startCreating);
    if (startCreating && tab === 'claims') setTab('catalog');
  }
  const [items, setItems] = useState(initialItems);
  const [selectedCode, setSelectedCode] = useState(initialItems[0]?.code ?? '');
  const [importedCount, setImportedCount] = useState(0);

  const selected = items.find((item) => item.code === selectedCode);

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader title="จัดการสวัสดิการ" description="เพิ่มและแก้ไขได้โดยตรง · ไม่อนุมัติคำขอเบิก · ข้อมูลตัวอย่าง" />

      <div className="-mx-4 flex items-center gap-[12px] border-b border-line px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="หมวดจัดการสวัสดิการ" className="scrollbar-none flex min-w-0 flex-1 gap-[4px] overflow-x-auto">
        {tabs.map(({ id, label }) => {
          const active = id === tab;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cx(
                '-mb-px shrink-0 border-b-2 px-[12px] py-[12px] text-14 sm:px-[18px] whitespace-nowrap transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                active ? 'border-primary-600 font-semibold text-primary-700' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
        {/* ประวัติการแก้ไขสวัสดิการรวมอยู่ที่หน้าประวัติของระบบ */}
        <Link
          href="/admin/logs?tab=welfare"
          className="inline-flex shrink-0 items-center gap-[4px] rounded-[4px] text-13 font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          ประวัติการแก้ไข
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-3">
        <StatCard label="สวัสดิการที่มีอยู่" value={String(items.length)} note="รายการ" />
        <StatCard
          label="วงเงินสวัสดิการที่เลือก"
          value={selected ? formatBahtWhole(selected.amount) : '—'}
          note={selected ? `ต่อคน / ${selected.budgetType === 'รายปี' ? 'ปี' : selected.budgetType} · ${selected.name}` : 'ยังไม่ได้เลือกสวัสดิการ'}
        />
        <StatCard
          label="เบิกย้อนหลังที่นำเข้า"
          value={String(importedCount)}
          note={importedCount === 0 ? 'รายการ · ยังไม่มีการนำเข้า' : 'รายการ'}
        />
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-[20px]">
        {/* แท็บนำเข้า: การ์ดนำเข้าอยู่บนสุด รายการสวัสดิการตามมาด้านล่าง */}
        {tab === 'import' ? (
          <ImportPanel preview={importPreview} onImported={(count) => setImportedCount((total) => total + count)} />
        ) : null}
        {tab === 'catalog' || tab === 'import' ? (
          <WelfareCatalog items={items} onItemsChange={setItems} selectedCode={selectedCode} onSelect={setSelectedCode} startCreating={startCreating} />
        ) : null}
        {tab === 'claims' ? <ClaimsTab claims={claims} employees={employees} /> : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-[6px] rounded-[6px] border border-line bg-white p-[16px] sm:min-h-[118px]">
      <p className="text-12 text-muted">{label}</p>
      <p className="text-24 font-semibold text-ink tabular-nums">{value}</p>
      <p className="truncate text-11 text-muted">{note}</p>
    </div>
  );
}
