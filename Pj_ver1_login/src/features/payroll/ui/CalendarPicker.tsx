'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/cx';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** เดือนที่ base + offset (ทดปีให้) */
export function monthAt(baseYear: number, baseMonth: number, offset: number) {
  const total = baseMonth - 1 + offset;
  return { year: baseYear + Math.floor(total / 12), month: (total % 12) + 1 };
}

/** "พฤศจิกายน 2569" */
export function thaiMonthLong(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const shortDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** วันที่ day ของ offset เดือนหลังเดือนตั้งต้น */
export type CalendarValue = { offset: number; day: number };

type Props = {
  label: string;
  baseYear: number;
  baseMonth: number;
  minOffset: number;
  maxOffset: number;
  value: CalendarValue;
  onChange: (value: CalendarValue) => void;
  isDisabled?: (value: CalendarValue) => boolean;
  invalid?: boolean;
};

/**
 * ช่องเลือกวันจ่ายแบบปฏิทิน: เลือกวันที่ในเดือนที่ยื่นหรือเดือนถัดๆ ไป
 * เสาร์–อาทิตย์ตัวแดง วันที่เลือกไม่ได้ขีดฆ่า · Esc หรือคลิกนอกปฏิทิน = ปิด
 */
export function CalendarPicker({ label, baseYear, baseMonth, minOffset, maxOffset, value, onChange, isDisabled, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(value.offset);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = monthAt(baseYear, baseMonth, value.offset);
  const shown = monthAt(baseYear, baseMonth, view);
  const firstWeekday = new Date(Date.UTC(shown.year, shown.month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(shown.year, shown.month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label}: ${shortDate(selected.year, selected.month, value.day)} (เปิดปฏิทิน)`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setView(value.offset);
          setOpen((current) => !current);
        }}
        className={cx(
          'flex h-[46px] w-full items-center justify-between gap-2 rounded-[8px] border bg-white px-3 text-left text-15 text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600',
          invalid ? 'border-[#991B1B]' : open ? 'border-primary-600' : 'border-line',
        )}
      >
        <span className="truncate tabular-nums">{shortDate(selected.year, selected.month, Math.min(value.day, new Date(Date.UTC(selected.year, selected.month, 0)).getUTCDate()))}</span>
        <Calendar className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open ? (
        <div role="dialog" aria-label={`ปฏิทิน ${label}`} className="origin-top-left animate-pop-in absolute left-0 top-full z-30 mt-2 w-[296px] rounded-[12px] border border-line bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView((current) => current - 1)}
              disabled={view <= minOffset}
              aria-label="เดือนก่อนหน้า"
              className="grid size-8 place-items-center rounded-[8px] text-muted hover:bg-[#EFF6FF] disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <p className="text-13 font-semibold text-ink" aria-live="polite">
              {thaiMonthLong(shown.year, shown.month)}
            </p>
            <button
              type="button"
              onClick={() => setView((current) => current + 1)}
              disabled={view >= maxOffset}
              aria-label="เดือนถัดไป"
              className="grid size-8 place-items-center rounded-[8px] text-muted hover:bg-[#EFF6FF] disabled:opacity-30"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-12">
            {WEEKDAYS.map((name, i) => (
              <span key={name} className={cx('py-1 font-medium', i === 0 || i === 6 ? 'text-[#B3261E]/80' : 'text-muted')}>
                {name}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`empty-${i}`} />;
              const weekend = i % 7 === 0 || i % 7 === 6;
              const isSelected = view === value.offset && day === value.day;
              const disabled = isDisabled?.({ offset: view, day }) ?? false;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`${shortDate(shown.year, shown.month, day)}${weekend ? ' (เสาร์–อาทิตย์)' : ''}`}
                  onClick={() => {
                    onChange({ offset: view, day });
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={cx(
                    'grid h-9 place-items-center rounded-[8px] text-13 tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-muted/40 disabled:line-through',
                    isSelected ? 'bg-primary-600 font-semibold text-white' : weekend ? 'text-[#B3261E] hover:bg-[#FEF2F2]' : 'text-ink hover:bg-[#EFF6FF]',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-line pt-2 text-12 text-muted">สีแดง = เสาร์–อาทิตย์ · ขีดฆ่า = เลือกไม่ได้</p>
        </div>
      ) : null}
    </div>
  );
}
