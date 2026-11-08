"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { THAI_MONTHS_FULL, THAI_MONTHS_SHORT, toBuddhistYear } from "@/features/payroll/lib/format";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** เดือนที่ base + offset (ทดปีให้) */
export function monthAt(baseYear: number, baseMonth: number, offset: number) {
  const total = baseMonth - 1 + offset;
  return { year: baseYear + Math.floor(total / 12), month: (total % 12) + 1 };
}

export interface CalendarValue {
  offset: number; // กี่เดือนหลังเดือนตั้งต้น (0 = เดือนเดียวกัน)
  day: number; // วันที่ 1–31
}

interface GridProps {
  baseYear: number; // เดือนตั้งต้นของปฏิทิน
  baseMonth: number;
  minOffset: number; // เลื่อนย้อนได้ถึงเดือนไหน
  maxOffset: number; // เลื่อนไปข้างหน้าได้ถึงเดือนไหน
  value: CalendarValue | null; // วันที่เลือกอยู่ (null = ยังไม่เลือก)
  onPick: (v: CalendarValue) => void;
  isDisabled?: (v: CalendarValue) => boolean; // วันที่ห้ามเลือก
  initialOffset?: number; // เปิดมาที่เดือนไหน
}

/**
 * ตารางปฏิทิน 1 เดือน มีปุ่ม ‹ › เลื่อนเดือน
 *   - เสาร์–อาทิตย์ ตัวเลขสีแดง (ให้เห็นว่าเป็นวันหยุด)
 *   - วันที่เลือกไม่ได้ มีขีดฆ่าและกดไม่ได้
 */
export function CalendarGrid({ baseYear, baseMonth, minOffset, maxOffset, value, onPick, isDisabled, initialOffset }: GridProps) {
  const [view, setView] = useState(initialOffset ?? value?.offset ?? minOffset);
  const shown = monthAt(baseYear, baseMonth, view);
  const firstWeekday = new Date(Date.UTC(shown.year, shown.month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(shown.year, shown.month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      {/* หัวปฏิทิน: ‹ เดือน ปี › */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView((v) => v - 1)}
          disabled={view <= minOffset}
          aria-label="เดือนก่อนหน้า"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-primary-50 disabled:opacity-30"
        >
          <Icon name="chevronLeft" className="size-4" />
        </button>
        <p className="text-12 font-semibold text-ink" aria-live="polite">
          {THAI_MONTHS_FULL[shown.month - 1]} {toBuddhistYear(shown.year)}
        </p>
        <button
          type="button"
          onClick={() => setView((v) => v + 1)}
          disabled={view >= maxOffset}
          aria-label="เดือนถัดไป"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-primary-50 disabled:opacity-30"
        >
          <Icon name="chevronRight" className="size-4" />
        </button>
      </div>

      {/* ตารางวัน */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-[12px]">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`py-1 font-medium ${i === 0 || i === 6 ? "text-status-rejected/80" : "text-muted"}`}>
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const weekend = i % 7 === 0 || i % 7 === 6;
          const isSel = value !== null && view === value.offset && d === value.day;
          const disabled = isDisabled?.({ offset: view, day: d }) ?? false;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              aria-pressed={isSel}
              aria-label={`${d} ${THAI_MONTHS_FULL[shown.month - 1]} ${toBuddhistYear(shown.year)}${weekend ? " (เสาร์–อาทิตย์)" : ""}`}
              onClick={() => onPick({ offset: view, day: d })}
              className={`num grid h-9 place-items-center rounded-lg text-12 transition-colors disabled:cursor-not-allowed disabled:text-muted/40 disabled:line-through ${
                isSel ? "bg-primary-600 font-semibold text-white" : weekend ? "text-status-rejected hover:bg-status-rejected/10" : "text-ink hover:bg-primary-50"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <p className="mt-2 border-t border-line pt-2 text-[12px] text-muted">สีแดง = เสาร์–อาทิตย์ · ขีดฆ่า = เลือกไม่ได้</p>
    </div>
  );
}

interface PickerProps extends Omit<GridProps, "value" | "onPick" | "initialOffset"> {
  label: string; // ชื่อช่อง เช่น "รอบที่ 1 จ่าย"
  value: CalendarValue;
  onChange: (v: CalendarValue) => void;
  error?: string;
}

/**
 * ปุ่มเลือกวันที่แบบปฏิทิน (กดแล้วปฏิทินเปิดขึ้นด้านบนของปุ่ม เพราะใช้ในแถบติดขอบล่างจอ)
 *   กด Esc หรือคลิกนอกปฏิทิน = ปิด
 * ค่าที่ได้เป็น { offset, day } คือ "วันที่ day ของ offset เดือนหลังเดือนตั้งต้น"
 */
export function CalendarPicker({ label, value, onChange, error, ...grid }: PickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = monthAt(grid.baseYear, grid.baseMonth, value.offset);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={`${label}: วันที่ ${value.day} ${THAI_MONTHS_FULL[selected.month - 1]} ${toBuddhistYear(selected.year)} (เปิดปฏิทิน)`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-13 text-ink focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none ${
          error ? "border-status-rejected" : open ? "border-primary-500" : "border-line"
        }`}
      >
        <span className="num truncate">
          {value.day} {THAI_MONTHS_SHORT[selected.month - 1]} {toBuddhistYear(selected.year)}
        </span>
        <Icon name="calendar" className="size-5 shrink-0 text-muted" />
      </button>

      {open && (
        <div role="dialog" aria-label={`ปฏิทิน ${label}`} className="absolute bottom-full left-0 z-30 mb-2 w-[296px] rounded-xl border border-line bg-white p-3 shadow-lg">
          <CalendarGrid
            {...grid}
            value={value}
            onPick={(v) => {
              onChange(v);
              setOpen(false);
              btnRef.current?.focus();
            }}
          />
        </div>
      )}
    </div>
  );
}
