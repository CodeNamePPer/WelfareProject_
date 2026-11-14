'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Search, X } from 'lucide-react';
import type { EmployeeBenefit } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';

const ALL = 'ทั้งหมด';

/** เหตุที่เลือกสวัสดิการนี้ไม่ได้ ว่างแปลว่าเลือกได้ */
export function blockedReason(benefit: EmployeeBenefit): string {
  if (benefit.maxClaims !== null && benefit.claimsThisYear >= benefit.maxClaims) return 'ครบจำนวนครั้งแล้ว';
  if (benefit.remaining <= 0) return 'ใช้วงเงินครบแล้ว';
  return '';
}

export const countText = (benefit: EmployeeBenefit) =>
  benefit.maxClaims !== null ? `เบิกแล้ว ${benefit.claimsThisYear}/${benefit.maxClaims} ครั้ง` : benefit.maxClaimsNote || 'ไม่จำกัดครั้ง';

/**
 * หน้าต่างเลือกสวัสดิการตาม R04: ค้นหา กรองตามหมวด ใช้บ่อย และการ์ดที่เลือกไม่ได้เป็นสีเทาพร้อมเหตุผล
 * ฐานข้อมูลยังไม่มีธงยื่นล่วงหน้าหรือเบิกให้ครอบครัว จึงกรองได้เฉพาะหมวด
 */
export function BenefitPicker({
  open,
  benefits,
  selectedCode,
  subtitle,
  onPick,
  onClose,
}: {
  open: boolean;
  benefits: EmployeeBenefit[];
  selectedCode: string;
  subtitle: string;
  onPick: (code: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setCategory(ALL);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const categories = useMemo(() => [ALL, ...Array.from(new Set(benefits.map((benefit) => benefit.category).filter(Boolean)))], [benefits]);
  const q = query.trim().toLowerCase();
  const shown = benefits.filter(
    (benefit) => (category === ALL || benefit.category === category) && (!q || benefit.name.toLowerCase().includes(q) || benefit.code.toLowerCase().includes(q)),
  );
  // ใช้บ่อย: สวัสดิการที่เบิกปีนี้มากที่สุด 3 รายการ
  const frequent = [...benefits].filter((benefit) => benefit.claimsThisYear > 0).sort((a, b) => b.claimsThisYear - a.claimsThisYear).slice(0, 3);
  const pick = (benefit: EmployeeBenefit) => {
    if (blockedReason(benefit)) return;
    onPick(benefit.code);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto max-h-[92vh] w-[calc(100%-32px)] max-w-[940px] overflow-auto rounded-xl border-0 bg-white p-0 text-14 text-ink shadow-[0_8px_24px_-6px_rgba(15,23,42,.25)] backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-3.5 p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-[18px] font-semibold">
              เลือกสวัสดิการ
            </h2>
            <p className="mt-0.5 text-13 text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink-soft hover:bg-slate-200">
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <label className="relative block">
          <span className="sr-only">ค้นหาสวัสดิการ</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อสวัสดิการ เช่น ฟิตเนส แว่น อบรม"
            className="h-[46px] w-full rounded-lg border border-slate-300 bg-white pr-3 pl-10 text-15 text-ink outline-none placeholder:text-muted focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </label>

        <div role="group" aria-label="ตัวกรอง" className="flex flex-wrap gap-1.5">
          {categories.map((item) => {
            const active = item === category;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item)}
                className={cx('h-8 rounded-full px-3.5 text-13', active ? 'bg-ink text-white' : 'border border-slate-300 bg-white text-ink-soft hover:bg-surface')}
              >
                {item}
              </button>
            );
          })}
        </div>

        {!q && category === ALL && frequent.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-12 font-semibold text-muted">ใช้บ่อย</p>
            <div className="flex flex-wrap gap-2">
              {frequent.map((benefit) => {
                const reason = blockedReason(benefit);
                return (
                  <button
                    key={benefit.code}
                    type="button"
                    aria-disabled={Boolean(reason)}
                    onClick={() => pick(benefit)}
                    className={cx(
                      'h-9 rounded-full px-3.5 text-13',
                      reason ? 'cursor-not-allowed border border-dashed border-slate-300 bg-slate-100 text-slate-400' : 'border border-blue-300 bg-primary-50 text-primary-700 hover:bg-primary-100',
                    )}
                  >
                    {benefit.name} <span className="text-12 text-muted">· {reason || baht(benefit.remaining)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="text-12 font-semibold text-muted">{shown.length} สวัสดิการ</p>
        {shown.length === 0 ? (
          <p className="rounded-lg bg-surface p-6 text-center text-muted">ไม่พบสวัสดิการที่ตรงกับคำค้น ลองค้นด้วยคำอื่นหรือล้างตัวกรอง</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {shown.map((benefit) => {
              const reason = blockedReason(benefit);
              const selected = benefit.code === selectedCode;
              return (
                <button
                  key={benefit.code}
                  type="button"
                  aria-disabled={Boolean(reason)}
                  aria-pressed={selected}
                  onClick={() => pick(benefit)}
                  className={cx(
                    'rounded-[10px] p-2.5 text-left text-14',
                    reason
                      ? 'cursor-not-allowed border border-dashed border-slate-300 bg-surface text-slate-400'
                      : selected
                        ? 'border-2 border-primary-600 bg-primary-50 text-ink'
                        : 'border border-line bg-white text-ink hover:border-primary-300',
                  )}
                >
                  <span aria-hidden="true" className={cx('flex h-[88px] items-center justify-center rounded-md text-slate-400', reason ? 'bg-[#EEF1F5]' : 'bg-mist')}>
                    <ImageIcon className="size-6" strokeWidth={1.5} />
                  </span>
                  <span className="mt-2 block text-12 text-muted">
                    {benefit.code} · {benefit.category}
                  </span>
                  <span className="block font-semibold">{benefit.name}</span>
                  <span className="mt-1 flex justify-between gap-2 text-12 text-muted">
                    <span>{countText(benefit)}</span>
                    <span className={cx('font-semibold tabular-nums', reason ? 'text-slate-400' : 'text-ink')}>{baht(benefit.remaining)}</span>
                  </span>
                  <span className={cx('mt-1 block text-11', reason ? 'text-orange-800' : 'text-status-approved-ink')}>{reason || 'เบิกได้เฉพาะตัวเอง'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}
