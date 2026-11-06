'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Period } from '../../types';

interface PeriodPickerProps {
  periods: Period[];
  value: string;
  onChange: (id: string) => void;
  /** จำนวนคำขอของพนักงานที่เลือกในช่วงนั้น – ใช้ทำจุดบอกว่าเดือนไหนมีรายการ และจำนวนต่อปี */
  countFor: (period: Period) => number;
  className?: string;
}

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const pad = (n: number) => String(n).padStart(2, '0');
const yearOf = (period: Period | undefined) => Number(period?.from.slice(0, 4) ?? new Date().getFullYear());

/**
 * ปุ่มเดียวสำหรับเลือกช่วงเวลา: เปิดเป็นปฏิทินเดือน (ตาราง 3×4 เลื่อนปีได้) หรือรายการทั้งปี
 * แทน select ยาวหลายสิบแถว + ปุ่มสลับแยกอีกชุด
 */
export function PeriodPicker({ periods, value, onChange, countFor, className }: PeriodPickerProps) {
  const selected = periods.find((item) => item.id === value);
  const byId = new Map(periods.map((item) => [item.id, item]));
  const years = periods.filter((item) => item.kind === 'year');
  const yearNumbers = years.map((item) => yearOf(item));
  const minYear = Math.min(...yearNumbers);
  const maxYear = Math.max(...yearNumbers);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'month' | 'year'>(selected?.kind === 'year' ? 'year' : 'month');
  const [viewYear, setViewYear] = useState(yearOf(selected));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    // โฟกัสช่องที่เลือกอยู่ ให้คีย์บอร์ดเริ่มจากตรงนั้น
    panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"], [role="tab"][aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const toggle = () => {
    if (!open) {
      setView(selected?.kind === 'year' ? 'year' : 'month');
      setViewYear(yearOf(selected));
    }
    setOpen((v) => !v);
  };

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const label = selected
    ? selected.kind === 'year'
      ? selected.label
      : `${MONTHS_TH[Number(selected.from.slice(5, 7)) - 1]} ${yearOf(selected) + 543}`
    : 'เลือกช่วงเวลา';

  return (
    <div
      ref={rootRef}
      className={cx('relative', className)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`ช่วงเวลา: ${label}`}
        onClick={toggle}
        className={cx(
          'flex h-[37px] w-full items-center gap-[8px] rounded-[6px] border bg-white pr-[10px] pl-[12px] text-13 text-ink',
          'hover:border-muted/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500',
          open ? 'border-primary-500 ring-1 ring-primary-500' : 'border-line',
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className={cx('size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="เลือกช่วงเวลา"
          className="absolute top-[calc(100%+6px)] right-0 z-30 w-[272px] rounded-[8px] border border-line bg-white p-[12px] shadow-[0_8px_24px_-8px_rgb(15_23_42/0.18)]"
        >
          <div role="tablist" aria-label="ดูยอดแบบ" className="grid grid-cols-2 gap-[2px] rounded-[6px] bg-surface p-[2px]">
            {(['month', 'year'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={view === tab}
                onClick={() => setView(tab)}
                className={cx(
                  'h-[28px] rounded-[4px] text-13 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  view === tab ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(15_23_42/0.08)]' : 'text-muted hover:text-ink',
                )}
              >
                {tab === 'month' ? 'รายเดือน' : 'รายปี'}
              </button>
            ))}
          </div>

          {view === 'month' ? (
            <div className="mt-[12px] flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  disabled={viewYear <= minYear}
                  aria-label="ปีก่อนหน้า"
                  className="inline-flex size-[28px] items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="text-14 font-semibold text-ink tabular-nums" aria-live="polite">
                  {viewYear + 543}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  disabled={viewYear >= maxYear}
                  aria-label="ปีถัดไป"
                  className="inline-flex size-[28px] items-center justify-center rounded-[6px] text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-[4px]">
                {MONTHS_TH.map((name, index) => {
                  const period = byId.get(`${viewYear}-${pad(index + 1)}`);
                  const isSelected = period?.id === value;
                  const count = period ? countFor(period) : 0;
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={!period}
                      aria-pressed={isSelected}
                      aria-label={`${name} ${viewYear + 543}${count ? `, ${count} รายการ` : ''}`}
                      onClick={() => period && choose(period.id)}
                      className={cx(
                        'relative flex h-[40px] flex-col items-center justify-center rounded-[6px] text-13 tabular-nums',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        'disabled:text-muted/40',
                        isSelected ? 'bg-primary-600 font-semibold text-white' : 'text-ink enabled:hover:bg-primary-50',
                      )}
                    >
                      {name}
                      {count > 0 ? (
                        <span
                          className={cx('absolute bottom-[5px] size-[4px] rounded-full', isSelected ? 'bg-white' : 'bg-primary-500')}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="flex items-center gap-[6px] text-11 text-muted">
                <span className="size-[4px] rounded-full bg-primary-500" aria-hidden="true" />
                เดือนที่พนักงานคนนี้มีคำขอ
              </p>
            </div>
          ) : (
            <ul className="mt-[12px] flex flex-col gap-[2px]">
              {years.map((period) => {
                const isSelected = period.id === value;
                const count = countFor(period);
                return (
                  <li key={period.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => choose(period.id)}
                      className={cx(
                        'flex h-[40px] w-full items-center justify-between rounded-[6px] px-[12px] text-13',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        isSelected ? 'bg-primary-600 font-semibold text-white' : 'text-ink hover:bg-primary-50',
                      )}
                    >
                      {period.label}
                      <span className={cx('text-12 tabular-nums', isSelected ? 'text-white/80' : 'text-muted')}>
                        {count ? `${count} รายการ` : 'ไม่มีรายการ'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
