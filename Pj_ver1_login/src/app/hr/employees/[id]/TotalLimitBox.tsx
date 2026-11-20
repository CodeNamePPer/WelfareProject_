'use client';

import { useNavTransition } from '@/lib/useNavTransition';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button, Input, ReadOnlyInput } from '@/features/hr/ui';

export type TotalLimitSummary = {
  /** เพดานรวมที่มีผลวันนี้ (null = ไม่จำกัด) */
  cap: number | null;
  /** ยอดที่ใช้ไปหรือรอตรวจทุกสวัสดิการในปีนี้ */
  used: number;
  /** คงเหลือของเพดานรวม (null = ไม่จำกัด) */
  remaining: number | null;
  /** วงเงินรวมที่ตั้งไว้ล่วงหน้า เช่น "฿50,000 ตั้งแต่ 1 ม.ค. 2570" */
  next: string | null;
};

const money = (value: number) => `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

type Errors = Partial<Record<'amount' | 'effectiveFrom' | 'reason' | 'form', string>>;

/** วงเงินรวมต่อปี (ทุกสวัสดิการรวมกัน) + กล่องปรับวงเงินรวม (เฉพาะหัวหน้า HR) */
export function TotalLimitBox({ employeeCode, summary, canAdjust }: { employeeCode: string; summary: TotalLimitSummary | null; canAdjust: boolean }) {
  const nav = useNavTransition();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [unlimited, setUnlimited] = useState(false);
  const [amount, setAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const open = () => {
    setEditing(true);
    setUnlimited(false);
    setAmount('');
    setEffectiveFrom(today());
    setReason('');
    setErrors({});
  };

  async function save() {
    if (busy) return;
    const value = Number(amount.replace(/,/g, ''));
    const next: Errors = {};
    if (!unlimited && (!amount.trim() || !Number.isFinite(value) || value < 0)) next.amount = 'กรอกวงเงินรวมเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';
    if (!effectiveFrom) next.effectiveFrom = 'เลือกวันที่มีผล';
    else if (effectiveFrom < today()) next.effectiveFrom = 'วันที่มีผลต้องเป็นวันนี้หรือหลังจากนี้';
    if (!reason.trim()) next.reason = 'ระบุเหตุผลที่ปรับวงเงินรวม';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/hr/employees/${encodeURIComponent(employeeCode)}/total-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: unlimited ? null : value, effectiveFrom, reason: reason.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const field = body.field === 'amount' || body.field === 'effectiveFrom' || body.field === 'reason' ? body.field : 'form';
        setErrors({ [field]: body.error ?? 'บันทึกวงเงินรวมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
        return;
      }
      notify('บันทึกวงเงินรวมต่อปีแล้ว');
      setEditing(false);
      nav.refresh();
    } catch {
      setErrors({ form: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] bg-[#F8FAFC] px-5 py-3">
        <div className="min-w-0">
          <span className="text-13 font-medium">วงเงินรวมต่อปี</span>{' '}
          {summary === null ? (
            <span className="text-13 text-muted">โหลดไม่สำเร็จ</span>
          ) : summary.cap === null ? (
            <span className="text-13 text-muted">ไม่จำกัด (ใช้วงเงินแยกตามสวัสดิการ)</span>
          ) : (
            <span className="text-13">
              <span className="font-semibold">{money(summary.cap)}</span>
              <span className="text-muted"> · ใช้ไปหรือรอตรวจ {money(summary.used)} · คงเหลือ </span>
              <span className="font-semibold">{money(summary.remaining ?? 0)}</span>
            </span>
          )}
          {summary?.next ? <span className="block text-11 text-muted">{summary.next}</span> : null}
        </div>
        {canAdjust && !editing ? (
          <button type="button" onClick={open} className="text-13 text-[#1D4ED8] hover:underline">
            ปรับวงเงินรวม
          </button>
        ) : null}
      </div>

      {editing ? (
        // กล่องเดียวกับปรับวงเงินรายสวัสดิการ (ขอบน้ำเงิน 1.5px)
        <section aria-labelledby="adjust-total-title" className="m-4 flex flex-col gap-3 rounded-[8px] border-[1.5px] border-[#1D4ED8] bg-white px-5 py-[18px]">
          <h3 id="adjust-total-title" className="text-16 font-semibold">
            ปรับวงเงินรวมต่อปี
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyInput
              label="วงเงินรวมปัจจุบัน"
              value={summary?.cap == null ? 'ไม่จำกัด' : summary.cap.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              reason="วงเงินรวมที่ใช้อยู่ แก้ที่ช่องวงเงินรวมใหม่"
            />
            <Input
              label={
                <>
                  วงเงินรวมใหม่ (บาท/ปี) {unlimited ? null : <span className="text-[#B3261E]">*</span>}
                </>
              }
              inputMode="decimal"
              value={unlimited ? '' : amount}
              placeholder={unlimited ? 'ไม่จำกัด' : undefined}
              disabled={unlimited}
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
          <label className="flex cursor-pointer items-center gap-2 text-13">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(event) => {
                setUnlimited(event.target.checked);
                setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              className="size-4 shrink-0 accent-[#1D4ED8]"
            />
            ไม่จำกัด (ยกเลิกเพดานรวม)
          </label>
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
            <Button onClick={() => void save()} disabled={busy || nav.isPending}>
              {busy ? 'กำลังบันทึก...' : 'บันทึกวงเงินรวม'}
            </Button>
            <Button variant="quiet" onClick={() => setEditing(false)} disabled={busy}>
              ยกเลิก
            </Button>
          </div>
          <p className="text-12 text-muted">
            นับยอดเบิกทุกสวัสดิการในปีปฏิทินตามวันที่เกิดค่าใช้จ่าย คำขอต้องผ่านทั้งวงเงินแยกสวัสดิการและวงเงินรวม คำขอที่ยื่นไปแล้วไม่ถูกตรวจซ้ำ · บันทึกใน Log
          </p>
        </section>
      ) : null}
    </>
  );
}
