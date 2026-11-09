'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../components/ui/PageHeader';
import { cx } from '../../lib/cx';
import { useDetailParam } from '../../lib/useDetailParam';
import type { Claim, Employee, ImportRecord, WelfareItem } from '../../types';
import { ClaimDetailPage, ClaimsTab } from './ClaimsTab';
import { ImportPanel } from './ImportPanel';
import { WelfareCatalog, type OpenItem } from './WelfareCatalog';
import { WelfareDetail } from './WelfareDetail';

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
  const [editingCode, setEditingCode] = useState<string | null>(null);
  // เพิ่มทุกครั้งที่บันทึกสำเร็จ เพื่อให้ฟอร์มรายละเอียดเริ่มจากค่าล่าสุดในฐานข้อมูล
  const [saveCount, setSaveCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  // ?claim=เลขที่คำขอ และ ?item=รหัสสวัสดิการ เปิดหน้ารายละเอียด ส่วนรายการยังอยู่เบื้องหลังเพื่อคงตัวกรองไว้
  const claimDetail = useDetailParam('claim');
  const openedClaim = claims.find((claim) => claim.code === claimDetail.id);
  const itemDetail = useDetailParam('item');
  const openedItem = items.find((item) => item.code === itemDetail.id);

  const openItem: OpenItem = (code, { edit = false, pushUrl = true } = {}) => {
    setEditingCode(edit ? code : null);
    if (pushUrl) itemDetail.open(code, { tab });
  };

  /** บันทึกลงฐานข้อมูล แล้วแทนที่แถวด้วยค่าที่ server คืนมา – คืนข้อความเมื่อไม่สำเร็จ */
  const saveItem = async (code: string, values: Partial<WelfareItem>): Promise<string | null> => {
    try {
      const response = await fetch('/api/admin/welfare', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, values }),
      });
      const data = await response.json();
      if (!response.ok) return data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      setItems((current) => current.map((item) => (item.code === code ? (data.item as WelfareItem) : item)));
      setSaveCount((count) => count + 1);
      return null;
    } catch {
      return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    }
  };

  /** ยกเลิกรายการใหม่ที่ยังไม่ได้บันทึก = เอาออกจากตารางแล้วกลับไปหน้ารายการ */
  const cancelEdit = (item: WelfareItem) => {
    setEditingCode(null);
    if (!item.unsaved) return;
    setItems((current) => current.filter((other) => other.code !== item.code));
    itemDetail.close();
  };

  const isDetailOpen = Boolean(openedClaim || openedItem);

  return (
    <>
    {openedClaim ? <ClaimDetailPage claim={openedClaim} claims={claims} employees={employees} /> : null}
    {openedItem && !openedClaim ? (
      <WelfareDetail
        key={`${openedItem.code}-${saveCount}`}
        item={openedItem}
        editing={editingCode === openedItem.code}
        onEdit={() => setEditingCode(openedItem.code)}
        onCancel={() => cancelEdit(openedItem)}
        onSave={async (patch) => {
          const error = await saveItem(openedItem.code, patch);
          if (!error) setEditingCode(null);
          return error;
        }}
      />
    ) : null}
    <div className={cx('flex flex-col gap-[20px]', isDetailOpen && 'hidden')}>
      <PageHeader title="จัดการสวัสดิการ" description="เพิ่มและแก้ไขสวัสดิการได้ทันที ตัวอย่างการนำเข้าประวัติยังเป็นข้อมูลตัวอย่าง" />

      {/* แผ่นเดียว: แถบหมวด, ตัวเลขสรุป, เนื้อหาแต่ละหมวด คั่นด้วยเส้น ไม่แยกเป็นการ์ด */}
      <div className="rounded-[10px] border border-line bg-white">
      <div className="flex items-center gap-[12px] border-b border-line pl-[8px] pr-[16px] sm:pl-[12px] sm:pr-[20px]">
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
        </Link>
      </div>

      <div className="grid grid-cols-1 divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <StatCard label="สวัสดิการที่มีอยู่" value={String(items.length)} note="รายการ" />
        <StatCard
          label="เปิดให้เบิกอยู่"
          value={String(items.filter((item) => item.status === 'active').length)}
          note={`จากทั้งหมด ${items.length} รายการ`}
        />
        <StatCard
          label="เบิกย้อนหลังที่นำเข้า"
          value={String(importedCount)}
          note={importedCount === 0 ? 'ยังไม่มีการนำเข้า' : 'รายการ'}
        />
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col">
        {/* แท็บนำเข้า: ส่วนนำเข้าอยู่บนสุด รายการสวัสดิการตามมาด้านล่าง */}
        {tab === 'import' ? (
          <ImportPanel preview={importPreview} onImported={(count) => setImportedCount((total) => total + count)} />
        ) : null}
        {tab === 'catalog' || tab === 'import' ? (
          <WelfareCatalog items={items} onItemsChange={setItems} onOpen={openItem} onSave={saveItem} startCreating={startCreating} />
        ) : null}
        {tab === 'claims' ? <ClaimsTab claims={claims} employees={employees} onOpen={(code) => claimDetail.open(code, { tab: 'claims' })} /> : null}
      </div>
      </div>
    </div>
    </>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px] p-[16px] sm:p-[20px]">
      <p className="text-12 text-muted">{label}</p>
      <p className="text-24 font-semibold text-ink tabular-nums">{value}</p>
      <p className="truncate text-11 text-muted">{note}</p>
    </div>
  );
}
