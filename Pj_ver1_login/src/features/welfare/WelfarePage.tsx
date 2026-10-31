'use client';

import { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { cx } from '../../lib/cx';
import { formatBahtWhole } from '../../lib/format';
import type { AuditEntry, Claim, Employee, ImportRecord, WelfareItem } from '../../types';
import { ClaimsTab } from './ClaimsTab';
import { HistoryTab } from './HistoryTab';
import { ImportPanel } from './ImportPanel';
import { WelfareCatalog } from './WelfareCatalog';

type TabId = 'catalog' | 'claims' | 'history' | 'import';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'catalog', label: 'สวัสดิการที่มีอยู่' },
  { id: 'claims', label: 'คำขอเบิก' },
  { id: 'history', label: 'ประวัติรายการ' },
  { id: 'import', label: 'นำเข้าประวัติ' },
];

interface WelfarePageProps {
  initialItems: WelfareItem[];
  importPreview: ImportRecord[];
  claims: Claim[];
  employees: Employee[];
  history: AuditEntry[];
}

// Layout follows Figma "Admin / จัดการสวัสดิการและนำเข้าประวัติ" (node 163:180).
export function WelfarePage({ initialItems, importPreview, claims, employees, history }: WelfarePageProps) {
  const [tab, setTab] = useState<TabId>('catalog');
  const [items, setItems] = useState(initialItems);
  const [selectedCode, setSelectedCode] = useState(initialItems[0]?.code ?? '');
  const [importedCount, setImportedCount] = useState(0);

  const selected = items.find((item) => item.code === selectedCode);

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader title="จัดการสวัสดิการ" description="เพิ่มและแก้ไขได้โดยตรง · ไม่อนุมัติคำขอเบิก · ข้อมูลตัวอย่าง" />

      <div role="tablist" aria-label="หมวดจัดการสวัสดิการ" className="flex gap-[4px] overflow-x-auto border-b border-line">
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
                '-mb-px border-b-2 px-[18px] py-[12px] text-[14px] whitespace-nowrap transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                active ? 'border-primary-600 font-semibold text-primary-700' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          );
        })}
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
        {tab === 'catalog' || tab === 'import' ? (
          <WelfareCatalog items={items} onItemsChange={setItems} selectedCode={selectedCode} onSelect={setSelectedCode} />
        ) : null}
        {tab === 'import' ? (
          <ImportPanel preview={importPreview} onImported={(count) => setImportedCount((total) => total + count)} />
        ) : null}
        {tab === 'claims' ? <ClaimsTab claims={claims} employees={employees} /> : null}
        {tab === 'history' ? <HistoryTab entries={history} /> : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex min-h-[118px] flex-col gap-[6px] rounded-[6px] border border-line bg-white p-[16px]">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="text-[24px] font-semibold text-ink tabular-nums">{value}</p>
      <p className="truncate text-[11px] text-muted">{note}</p>
    </div>
  );
}
