'use client';

import { useMemo, useState } from 'react';
import { BenefitThumb } from '@/features/requester/ui';
import { Badge, EmptyState, Tabs, fieldClass } from '@/features/hr/ui';
import { cx } from '../../lib/cx';
import type { WelfareItem } from '../../types';

type Tab = 'active' | 'closed' | 'all';

// คอลัมน์เดียวกับ HR (/hr/benefits — ดีไซน์ H03)
const COLS = 'grid-cols-[64px_minmax(0,2fr)_minmax(0,1fr)_120px_120px_140px]';
const money = (value: number) => `฿${value.toLocaleString('th-TH')}`;

export type OpenItem = (code: string, options?: { edit?: boolean; pushUrl?: boolean }) => void;

interface WelfareCatalogProps {
  items: WelfareItem[];
  openProposalByCode?: Map<string, string>;
  onOpen: OpenItem;
}

export function WelfareCatalog({ items, openProposalByCode, onOpen }: WelfareCatalogProps) {
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');

  const realItems = useMemo(() => items.filter((i) => !i.unsaved), [items]);
  const activeCount = useMemo(() => realItems.filter((item) => item.status === 'active').length, [realItems]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return realItems.filter((item) => {
      if (tab === 'active' && item.status !== 'active') return false;
      if (tab === 'closed' && item.status === 'active') return false;
      return !q || `${item.code} ${item.name} ${item.category ?? ''}`.toLowerCase().includes(q);
    });
  }, [realItems, tab, query]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pr-4">
        <Tabs
          label="สถานะสวัสดิการ"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'active', label: 'เปิดใช้', count: activeCount },
            { id: 'closed', label: 'ปิดรับคำขอ', count: realItems.length - activeCount },
            { id: 'all', label: 'ทั้งหมด', count: realItems.length },
          ]}
        />
        <div className="px-4 py-2 sm:px-0">
          <input
            type="search"
            aria-label="ค้นหาสวัสดิการ"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อ รหัส หรือหมวด"
            className={cx(fieldClass, '!h-9 w-full sm:!w-[260px]')}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState>
          {query.trim()
            ? 'ไม่พบสวัสดิการที่ตรงกับคำค้นหา'
            : tab === 'closed'
              ? 'ไม่มีสวัสดิการที่ปิดรับคำขอ'
              : 'ยังไม่มีรายการสวัสดิการ'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className={cx('grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span />
              <span>สวัสดิการ</span>
              <span>หมวด</span>
              <span className="text-right">วงเงิน</span>
              <span>จำนวนครั้ง</span>
              <span>สถานะ</span>
            </div>
            {shown.map((item) => {
              const openProposalNo = openProposalByCode?.get(item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onOpen(item.code)}
                  className={cx(
                    'grid w-full items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3 text-left text-ink transition-colors hover:bg-surface motion-reduce:transition-none',
                    COLS,
                  )}
                >
                  <BenefitThumb category={item.category || 'ทั่วไป'} className="h-12 w-16 rounded-[6px]" />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-12 text-muted">{item.code}</span>
                  </span>
                  <span className="text-13">{item.category || 'ทั่วไป'}</span>
                  <span className="text-right tabular-nums">{money(item.amount)}</span>
                  <span className="text-13">{item.maxClaims || 'ไม่จำกัด'}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {item.status === 'active' ? <Badge tone="approved">เปิดใช้</Badge> : <Badge tone="neutral">ปิดรับคำขอ</Badge>}
                    {openProposalNo ? <Badge tone="review">รออนุมัติ</Badge> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
