'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import type { UnavailableBenefit, UnavailableDisplay } from '@/lib/hr/benefitVisibility';
import { Card, EmptyState } from '@/features/hr/ui';

// คอลัมน์ตามดีไซน์ HH3
const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_280px]';
const OPTIONS: { id: UnavailableDisplay; label: string }[] = [
  { id: 'faded', label: 'แสดงเป็นสีเทา' },
  { id: 'hidden', label: 'ซ่อน' },
];

export function VisibilityClient({ rows }: { rows: UnavailableBenefit[] }) {
  const { notify } = useToast();
  const [values, setValues] = useState<Record<string, UnavailableDisplay>>(() => Object.fromEntries(rows.map((row) => [row.code, row.display])));
  const [saving, setSaving] = useState<string | null>(null);
  const sample = rows.find((row) => values[row.code] === 'faded') ?? rows[0];

  async function change(row: UnavailableBenefit, display: UnavailableDisplay) {
    if (saving || values[row.code] === display) return;
    const previous = values[row.code];
    setValues({ ...values, [row.code]: display });
    setSaving(row.code);
    try {
      const response = await fetch('/api/hr/visibility', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: row.code, display }) });
      if (!response.ok) throw new Error();
      notify(`${row.name}: ${display === 'hidden' ? 'ซ่อนจากพนักงานแล้ว' : 'แสดงเป็นสีเทาแล้ว'}`);
    } catch {
      setValues((current) => ({ ...current, [row.code]: previous }));
      notify('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Card>
        {rows.length === 0 ? (
          <EmptyState>ทุกสวัสดิการเปิดใช้และมีวงเงิน ไม่มีรายการที่ต้องตั้งค่า</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[780px]">
              <div className={cx('grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                <span>สวัสดิการ</span>
                <span>เหตุที่ใช้ไม่ได้</span>
                <span className="text-right">พนักงานเห็นเป็น</span>
              </div>
              {rows.map((row) => (
                <div key={row.code} className={cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3.5', COLS)}>
                  <span className="min-w-0">
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-12 text-muted">{row.code}</span>
                  </span>
                  <span className="text-13 text-ink-soft">{row.reason}</span>
                  <div role="radiogroup" aria-label={`การแสดง ${row.name}`} className="flex w-fit justify-self-end rounded-[999px] bg-[#F1F5F9] p-[3px]">
                    {OPTIONS.map((option) => {
                      const checked = values[row.code] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          disabled={saving === row.code}
                          onClick={() => void change(row, option.id)}
                          className={cx('h-[30px] rounded-[999px] px-3.5 text-13 disabled:cursor-wait', checked ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-muted hover:text-ink')}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      {sample ? (
        <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="w-[220px] rounded-[8px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 text-13 text-[#6B778C]">
            <div className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-[#94A3B8]" aria-hidden="true" />
              <b className="font-semibold">{sample.name}</b>
            </div>
            <div>{sample.reason}</div>
          </div>
          <p className="m-0 flex-[1_1_300px] text-13 text-ink-soft">ตัวอย่างการ์ดสีเทาที่พนักงานเห็นในหน้าสิทธิ์สวัสดิการ ยื่นคำขอไม่ได้ · การเปลี่ยนแปลงบันทึกใน Log และมีผลทันที</p>
        </Card>
      ) : null}
    </>
  );
}
