'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Employee } from '../../types';

interface EmployeePickerProps {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  /** จำนวนคำขอของแต่ละคนในช่วงที่เลือก – ใช้จัดลำดับและแสดงท้ายแถว */
  claimCounts: Map<string, number>;
  className?: string;
}

/** แสดงไม่เกินเท่านี้ต่อครั้ง ที่เหลือให้พิมพ์ค้นหา – รายชื่อหลักพันจะไม่ทำให้ป๊อปโอเวอร์ยาวหรือหน่วง */
const MAX_RESULTS = 50;

const normalize = (text: string) => text.toLocaleLowerCase('th-TH').replace(/\s+/g, '');

/**
 * ตัวเลือกพนักงานแบบค้นหาได้ (ARIA combobox) แทน <select> ที่ยาวตามจำนวนพนักงาน
 * ค้นได้ทั้งชื่อ รหัส และแผนก คนที่มีคำขอในช่วงนี้ขึ้นก่อน
 */
export function EmployeePicker({ employees, value, onChange, claimCounts, className }: EmployeePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;

  const selected = employees.find((item) => item.id === value);

  const { results, total } = useMemo(() => {
    const q = normalize(query);
    const matches = employees.filter(
      (item) => !q || normalize(`${item.name}${item.code}${item.department ?? ''}`).includes(q),
    );
    // มีคำขอมากก่อน แล้วเรียงตามชื่อ
    matches.sort(
      (a, b) => (claimCounts.get(b.id) ?? 0) - (claimCounts.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'th'),
    );
    return { results: matches.slice(0, MAX_RESULTS), total: matches.length };
  }, [employees, query, claimCounts]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const openPicker = () => {
    setQuery('');
    setActive(0);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (employee: Employee | undefined) => {
    if (!employee) return;
    onChange(employee.id);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(Math.max(results.length - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        choose(results[active]);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`เลือกพนักงาน: ${selected ? `${selected.name} ${selected.code}` : 'ยังไม่ได้เลือก'}`}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openPicker();
          }
        }}
        className={cx(
          'flex h-[37px] w-full items-center gap-[8px] rounded-[6px] border bg-white pr-[10px] pl-[12px] text-left text-13 text-ink',
          'hover:border-muted/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500',
          open ? 'border-primary-500 ring-1 ring-primary-500' : 'border-line',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              {selected.name} <span className="text-muted tabular-nums">{selected.code}</span>
            </>
          ) : (
            <span className="text-muted">เลือกพนักงาน</span>
          )}
        </span>
        <ChevronDown className={cx('size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 z-30 flex w-full flex-col overflow-hidden rounded-[8px] border border-line bg-white shadow-[0_8px_24px_-8px_rgb(15_23_42/0.18)] sm:w-[340px]">
          <div className="relative border-b border-line">
            <Search className="pointer-events-none absolute top-1/2 left-[12px] size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length ? optionId(active) : undefined}
              aria-label="ค้นหาพนักงาน"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="ค้นหาชื่อ รหัส หรือแผนก"
              className="h-[40px] w-full bg-transparent pr-[12px] pl-[36px] text-13 text-ink placeholder:text-muted focus:outline-none"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label="รายชื่อพนักงาน" className="max-h-[288px] overflow-y-auto py-[4px]">
            {results.map((item, index) => {
              const count = claimCounts.get(item.id) ?? 0;
              const isSelected = item.id === value;
              return (
                <li
                  key={item.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cx(
                    'flex cursor-pointer items-center gap-[10px] px-[12px] py-[8px]',
                    index === active && 'bg-primary-50',
                  )}
                >
                  <Check className={cx('size-4 shrink-0 text-primary-600', !isSelected && 'invisible')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate text-13 text-ink', isSelected && 'font-semibold')}>{item.name}</span>
                    <span className="block truncate text-12 text-muted">
                      <span className="tabular-nums">{item.code}</span>
                      {item.department ? `, ${item.department}` : ''}
                    </span>
                  </span>
                  {count > 0 ? (
                    <span className="shrink-0 text-12 text-muted tabular-nums">{count} รายการ</span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {results.length === 0 ? (
            <p className="px-[12px] pt-[4px] pb-[14px] text-13 text-muted">ไม่พบพนักงานที่ตรงกับ “{query}” ลองค้นด้วยรหัสพนักงาน</p>
          ) : total > results.length ? (
            <p className="border-t border-line px-[12px] py-[8px] text-12 text-muted">
              แสดง {results.length} จาก {total.toLocaleString('th-TH')} คน พิมพ์เพื่อค้นหาเพิ่ม
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
