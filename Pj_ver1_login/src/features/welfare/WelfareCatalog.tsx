'use client';

import { useMemo, useState } from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FilterChips } from '../../components/ui/FilterChips';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Tag } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { WelfareItem } from '../../types';
import { WelfareDetail } from './WelfareDetail';

type Filter = 'all' | 'active' | 'recent';

const PAGE_SIZE = 12;
const RECENT_DAYS = 7;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextCode(items: WelfareItem[]): string {
  const max = items.reduce((highest, item) => Math.max(highest, Number(item.code.replace(/\D/g, '')) || 0), 0);
  return `WEL-${String(max + 1).padStart(3, '0')}`;
}

interface WelfareCatalogProps {
  items: WelfareItem[];
  onItemsChange: (items: WelfareItem[]) => void;
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function WelfareCatalog({ items, onItemsChange, selectedCode, onSelect }: WelfareCatalogProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [menuCode, setMenuCode] = useState<string | null>(null);

  // "แก้ไขล่าสุด" = edited within RECENT_DAYS of the most recent edit.
  const recentFrom = useMemo(() => {
    const latest = items.reduce((max, item) => (item.updatedAt > max ? item.updatedAt : max), '');
    if (!latest) return '';
    const date = new Date(`${latest}T00:00:00`);
    date.setDate(date.getDate() - RECENT_DAYS);
    return date.toISOString().slice(0, 10);
  }, [items]);

  const counts = {
    all: items.length,
    active: items.filter((item) => item.status === 'active').length,
    recent: items.filter((item) => item.updatedAt > recentFrom).length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'active' && item.status !== 'active') return false;
      if (filter === 'recent' && item.updatedAt <= recentFrom) return false;
      return !q || `${item.code} ${item.name} ${item.owner}`.toLowerCase().includes(q);
    });
  }, [items, filter, query, recentFrom]);

  const rows = paginate(filtered, page, PAGE_SIZE);
  const selected = items.find((item) => item.code === selectedCode);

  const update = (code: string, patch: Partial<WelfareItem>) =>
    onItemsChange(items.map((item) => (item.code === code ? { ...item, ...patch, updatedAt: todayIso() } : item)));

  const addItem = () => {
    const code = nextCode(items);
    const draft: WelfareItem = {
      code,
      name: 'สวัสดิการใหม่',
      updatedAt: todayIso(),
      owner: 'Admin',
      amount: 0,
      status: 'inactive',
      budgetType: 'รายปี',
      maxClaims: '',
      eligible: 'พนักงานประจำ',
      startDate: '',
      approver: 'HR (Reviewer)',
      estimatedBudget: '—',
      documents: [],
      step: 0,
    };
    onItemsChange([draft, ...items]);
    setFilter('all');
    setQuery('');
    setPage(1);
    onSelect(code);
    setEditingCode(code);
  };

  return (
    <div className="grid grid-cols-1 gap-[20px] xl:grid-cols-[minmax(0,1fr)_350px]">
      <section aria-labelledby="welfare-list-title" className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
        <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
          <h2 id="welfare-list-title" className="text-[17px] font-semibold text-ink">
            รายการสวัสดิการที่มีอยู่
          </h2>
          <div className="flex flex-col gap-[8px] sm:flex-row">
            <SearchInput
              label="ค้นหาสวัสดิการ"
              placeholder="ค้นหาชื่อสวัสดิการ / ผู้ดูแล"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              className="sm:w-[280px]"
            />
            <Button variant="primary" onClick={addItem}>
              <Plus className="size-4" aria-hidden="true" />
              เพิ่มสวัสดิการ
            </Button>
          </div>
        </div>

        <FilterChips
          label="กรองสวัสดิการ"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: counts.all },
            { id: 'active', label: 'ใช้งานอยู่', count: counts.active },
            { id: 'recent', label: 'แก้ไขล่าสุด', count: counts.recent },
          ]}
        />

        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>รหัส</th>
                <th scope="col" className={table.th}>วันที่แก้ไข</th>
                <th scope="col" className={table.th}>ชื่อสวัสดิการ</th>
                <th scope="col" className={table.th}>ผู้ดูแล</th>
                <th scope="col" className={table.th}>วงเงิน</th>
                <th scope="col" className={table.th}>สถานะ</th>
                <th scope="col" className={table.th}>
                  <span className="sr-only">จัดการ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cx(table.td, 'py-[40px] text-center text-muted')}>
                    ไม่พบสวัสดิการที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const isSelected = item.code === selectedCode;
                  return (
                    <tr
                      key={item.code}
                      onClick={() => onSelect(item.code)}
                      aria-selected={isSelected}
                      className={cx(table.row, 'cursor-pointer', isSelected ? table.rowSelected : table.rowHover)}
                    >
                      <td className={cx(table.td, 'font-semibold whitespace-nowrap')}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(item.code);
                          }}
                          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {item.code}
                        </button>
                      </td>
                      <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>{formatShortThaiDate(item.updatedAt)}</td>
                      <td className={table.td}>{item.name}</td>
                      <td className={cx(table.td, 'text-muted')}>{item.owner}</td>
                      <td className={cx(table.td, 'whitespace-nowrap tabular-nums')}>{formatBahtWhole(item.amount)}</td>
                      <td className={table.td}>
                        <Tag tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'ใช้งาน' : 'หยุดใช้'}</Tag>
                      </td>
                      <td className={cx(table.td, 'relative w-[48px]')} onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setMenuCode(menuCode === item.code ? null : item.code)}
                          aria-haspopup="menu"
                          aria-expanded={menuCode === item.code}
                          aria-label={`ตัวเลือกสำหรับ ${item.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-primary-50 hover:text-ink"
                        >
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </button>
                        {menuCode === item.code ? (
                          <RowMenu
                            active={item.status === 'active'}
                            onClose={() => setMenuCode(null)}
                            onEdit={() => {
                              onSelect(item.code);
                              setEditingCode(item.code);
                            }}
                            onToggle={() => update(item.code, { status: item.status === 'active' ? 'inactive' : 'active' })}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto pt-[8px]">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        </div>
      </section>

      {selected ? (
        <WelfareDetail
          key={selected.code}
          item={selected}
          editing={editingCode === selected.code}
          onEdit={() => setEditingCode(selected.code)}
          onCancel={() => setEditingCode(null)}
          onSave={(patch) => {
            update(selected.code, patch);
            setEditingCode(null);
          }}
        />
      ) : (
        <p className="rounded-[10px] border border-dashed border-line bg-white p-[20px] text-center text-[14px] text-muted">
          เลือกสวัสดิการจากตารางเพื่อดูรายละเอียด
        </p>
      )}
    </div>
  );
}

function RowMenu({
  active,
  onClose,
  onEdit,
  onToggle,
}: {
  active: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const itemClass = 'block w-full px-[12px] py-[8px] text-left text-[13px] text-ink hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none';
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
      <div
        role="menu"
        className="absolute top-[44px] right-[8px] z-20 w-[150px] overflow-hidden rounded-[8px] border border-line bg-white py-[4px] shadow-lg"
        onKeyDown={(event) => event.key === 'Escape' && onClose()}
      >
        <button
          type="button"
          role="menuitem"
          autoFocus
          className={itemClass}
          onClick={() => {
            onEdit();
            onClose();
          }}
        >
          แก้ไข
        </button>
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          onClick={() => {
            onToggle();
            onClose();
          }}
        >
          {active ? 'หยุดใช้' : 'เปิดใช้งาน'}
        </button>
      </div>
    </>
  );
}
