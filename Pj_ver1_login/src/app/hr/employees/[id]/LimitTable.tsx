'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, ReadOnlyInput } from '@/features/hr/ui';

export type LimitRow = {
  code: string;
  name: string;
  /** วงเงินตามระดับ (วงเงินกลางของสวัสดิการ) */
  base: number;
  /** วงเงินที่ใช้กับคนนี้วันนี้ (รายคน ถ้ามี) */
  own: number;
  /** มีวงเงินรายคนที่มีผลแล้ว */
  custom: boolean;
  /** วงเงินรายคนที่ตั้งไว้ล่วงหน้า เช่น "฿25,000 ตั้งแต่ 1 ธ.ค. 2569" */
  next: string | null;
  claims: string;
  /** คงเหลือคิดจากวงเงินคนนี้ (null = ไม่มีเพดาน) */
  remaining: number | null;
};

// คอลัมน์ตามดีไซน์ H09
const COLS = 'grid-cols-[minmax(0,2fr)_120px_120px_90px_110px_110px]';
const money = (value: number) => `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

type Errors = Partial<Record<'amount' | 'effectiveFrom' | 'reason' | 'form', string>>;

/** ตารางสิทธิ์และวงเงินรายคน + กล่องปรับวงเงิน (เฉพาะ HR) */
export function LimitTable({ employeeCode, rows, canAdjust }: { employeeCode: string; rows: LimitRow[]; canAdjust: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [editing, setEditing] = useState<LimitRow | null>(null);
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const open = (row: LimitRow) => {
    setEditing(row);
    setAmount('');
    setEffectiveFrom(today());
    setReason('');
    setErrors({});
  };

  async function save() {
    if (!editing || busy) return;
    const value = Number(amount.replace(/,/g, ''));
    const next: Errors = {};
    if (!amount.trim() || !Number.isFinite(value) || value < 0) next.amount = 'กรอกวงเงินใหม่เป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
    if (!effectiveFrom) next.effectiveFrom = 'เลือกวันที่มีผล';
    else if (effectiveFrom < today()) next.effectiveFrom = 'วันที่มีผลต้องเป็นวันนี้หรือหลังจากนี้';
    if (!reason.trim()) next.reason = 'ระบุเหตุผลที่ปรับวงเงิน';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/hr/employees/${encodeURIComponent(employeeCode)}/limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefitCode: editing.code, amount: value, effectiveFrom, reason: reason.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const field = body.field === 'amount' || body.field === 'effectiveFrom' || body.field === 'reason' ? body.field : 'form';
        setErrors({ [field]: body.error ?? 'บันทึกวงเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
        return;
      }
      notify(`บันทึกวงเงิน ${editing.name} แล้ว`);
      setEditing(null);
      router.refresh();
    } catch {
      setErrors({ form: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
            <span>สวัสดิการ</span>
            <span>ตามระดับ</span>
            <span>วงเงินคนนี้</span>
            <span>ครั้ง</span>
            <span>คงเหลือ</span>
            <span />
          </div>
          {rows.map((row) => (
            <div key={row.code} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3', COLS, editing?.code === row.code && 'bg-[#EFF6FF]')}>
              <span className="font-medium">{row.name}</span>
              <span className="text-muted">{row.base > 0 ? money(row.base) : '—'}</span>
              <span>
                <span className="block font-semibold">{row.own > 0 || row.custom ? money(row.own) : '—'}</span>
                {row.custom ? <span className="block text-11 text-[#1E40AF]">วงเงินรายคน</span> : null}
                {row.next ? <span className="block text-11 text-muted">{row.next}</span> : null}
              </span>
              <span>{row.claims}</span>
              <span>{row.remaining === null ? '—' : money(row.remaining)}</span>
              {canAdjust ? (
                <button type="button" onClick={() => open(row)} className="text-right text-13 text-[#1D4ED8] hover:underline">
                  ปรับวงเงิน
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        // กล่องปรับวงเงิน (ดีไซน์ H09: ขอบน้ำเงิน 1.5px) อยู่ใต้ตารางในการ์ดเดียวกัน
        <section aria-labelledby="adjust-title" className="m-4 flex flex-col gap-3 rounded-[8px] border-[1.5px] border-[#1D4ED8] bg-white px-5 py-[18px]">
          <h3 id="adjust-title" className="text-16 font-semibold">
            ปรับวงเงิน: {editing.name}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyInput label="วงเงินปัจจุบัน" value={editing.own.toLocaleString('th-TH', { minimumFractionDigits: 2 })} reason="วงเงินที่ใช้อยู่ แก้ที่ช่องวงเงินใหม่" />
            <Input
              label={
                <>
                  วงเงินใหม่ (บาท) <span className="text-[#B3261E]">*</span>
                </>
              }
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errors.amount}
              autoFocus
            />
            <Input
              label={
                <>
                  มีผลตั้งแต่ <span className="text-[#B3261E]">*</span>
                </>
              }
              type="date"
              min={today()}
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              error={errors.effectiveFrom}
            />
          </div>
          <Input
            label={
              <>
                เหตุผล <span className="text-[#B3261E]">*</span>
              </>
            }
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            error={errors.reason}
          />
          {errors.form ? (
            <p role="alert" className="text-13 text-[#991B1B]">
              {errors.form}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? 'กำลังบันทึก...' : 'บันทึกวงเงิน'}
            </Button>
            <Button variant="quiet" onClick={() => setEditing(null)} disabled={busy}>
              ยกเลิก
            </Button>
          </div>
          <p className="text-12 text-muted">ใช้แทนวงเงินตามระดับตั้งแต่วันที่มีผล คำขอที่ยื่นไปแล้วใช้วงเงินเดิม · บันทึกใน Log</p>
        </section>
      ) : null}
    </>
  );
}
