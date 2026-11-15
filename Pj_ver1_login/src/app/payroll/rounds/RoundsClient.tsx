'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, ReadOnlyInput, Textarea, fieldClass, type BadgeTone } from '@/features/hr/ui';
import { FinDialog, FormError, financeAction } from '@/features/finance/ui';
import { MAX_CUTOFF_DAYS, validatePaySettings, type PaySettings } from '@/features/payroll/lib/pay-settings';
import type { RoundState } from '@/lib/payroll/finance';

export type RoundRow = {
  key: string;
  label: string;
  period: string;
  payDate: string;
  payDateIso: string;
  cutoff: string;
  count: number;
  total: number;
  state: RoundState;
  /** ผู้ขอที่ยังรอเงินในรอบนี้ (ได้รับแจ้งเมื่อเลื่อนวันจ่าย) */
  people: number;
  canReschedule: boolean;
};

const STATE: Record<RoundState, { tone: BadgeTone; label: string }> = {
  open: { tone: 'review', label: 'เปิดอยู่' },
  not_started: { tone: 'neutral', label: 'ยังไม่เริ่ม' },
  closed: { tone: 'finance', label: 'ปิดรอบแล้ว' },
  paid: { tone: 'paid', label: 'จ่ายแล้ว' },
};

// คอลัมน์ตามดีไซน์ F02
const COLS = 'grid-cols-[minmax(0,1.6fr)_120px_140px_110px_70px_110px_120px_110px]';

function Reschedule({ row, today, onClose }: { row: RoundRow; today: string; onClose: () => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!date) return setError('กรุณาเลือกวันจ่ายใหม่');
    if (!reason.trim()) return setError('กรุณาระบุเหตุผล');
    setBusy(true);
    const { error: failure, data } = await financeAction({ type: 'reschedule_round', key: row.key, date, reason: reason.trim() });
    setBusy(false);
    if (failure) return setError(failure);
    notify(`เลื่อนวันจ่าย${row.label}แล้ว · แจ้งผู้ขอ ${Number(data.notified ?? 0)} คน`);
    onClose();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyInput label="วันจ่ายเดิม" value={row.payDate} />
        <Input label={<>วันจ่ายใหม่ <span className="text-[#B3261E]">*</span></>} type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required />
      </div>
      <Textarea label={<>เหตุผล <span className="text-[#B3261E]">*</span></>} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required />
      <p className="rounded-[8px] bg-[#FFFBEB] px-3 py-2.5 text-13 text-[#92400E]">
        {row.people > 0 ? `ผู้ขอ ${row.people} คนในรอบนี้จะได้รับแจ้งวันจ่ายใหม่ทางระบบ` : 'ยังไม่มีผู้ขอในรอบนี้ คำขอที่เข้ารอบภายหลังจะใช้วันจ่ายใหม่'}
      </p>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'ยืนยันเลื่อนวันจ่าย'}
        </Button>
      </div>
    </div>
  );
}

export function RoundsClient({
  settings,
  offsetLabels,
  rows,
  today,
}: {
  settings: PaySettings & { cutoffDays: number };
  offsetLabels: { round1: string; round2: string };
  rows: RoundRow[];
  today: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [draft, setDraft] = useState({ r1: String(settings.round1PayDay), r2: String(settings.round2PayDay), cutoff: String(settings.cutoffDays) });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<RoundRow | null>(null);

  const save = async () => {
    const next: PaySettings = { ...settings, round1PayDay: Number(draft.r1), round2PayDay: Number(draft.r2), cutoffDays: Number(draft.cutoff) };
    const errors = validatePaySettings(next);
    const first = errors.round1 ?? errors.round2 ?? errors.cutoff;
    if (first) return setError(first);
    setError(null);
    setSaving(true);
    try {
      const response = await fetch('/api/payroll/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      else {
        notify('บันทึกรอบจ่ายแล้ว');
        router.refresh();
      }
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    setSaving(false);
  };

  const dayInput = (key: 'r1' | 'r2' | 'cutoff', id: string) => (
    <input
      id={id}
      inputMode="numeric"
      value={draft[key]}
      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, '').slice(0, 2) }))}
      className={cx(fieldClass, 'w-[120px]')}
    />
  );

  return (
    <>
      <PageHeader title="ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย" description="ค่าจาก system_setting.pay_schedule · ผู้ส่งคำขอเห็นวันจ่ายชุดเดียวกันนี้" />

      <Card className="flex flex-col gap-3 px-5 py-[18px]">
        <div className="flex flex-wrap items-end gap-4">
          <Field id="f2-r1" label="รอบที่ 1 (ยื่น 1–15) จ่ายวันที่">
            <span className="flex items-center gap-1.5">
              {dayInput('r1', 'f2-r1')} <span className="text-13 whitespace-nowrap text-muted">{offsetLabels.round1}</span>
            </span>
          </Field>
          <Field id="f2-r2" label="รอบที่ 2 (ยื่น 16–สิ้นเดือน) จ่ายวันที่">
            <span className="flex items-center gap-1.5">
              {dayInput('r2', 'f2-r2')} <span className="text-13 whitespace-nowrap text-muted">{offsetLabels.round2}</span>
            </span>
          </Field>
          <Field id="f2-cut" label="ปิดรอบก่อนวันจ่าย" hint={`0–${MAX_CUTOFF_DAYS} วัน`}>
            <span className="flex items-center gap-1.5">
              {dayInput('cutoff', 'f2-cut')} <span className="text-13 text-muted">วัน</span>
            </span>
          </Field>
          <Button onClick={save} disabled={saving} className="mb-[22px]">
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
        <FormError>{error}</FormError>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span>รอบ</span>
              <span>ช่วงยื่น</span>
              <span>วันจ่าย</span>
              <span>ปิดรอบ</span>
              <span>รายการ</span>
              <span>ยอดรวม</span>
              <span>สถานะ</span>
              <span />
            </div>
            {rows.length === 0 ? (
              <EmptyState>ยังไม่มีรอบจ่าย</EmptyState>
            ) : (
              rows.map((row) => (
                <div key={row.key} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3.5', COLS)}>
                  <span className="font-medium">{row.label}</span>
                  <span className="text-13">{row.period}</span>
                  <span className="font-semibold">{row.payDate}</span>
                  <span className="text-13">{row.cutoff}</span>
                  <span className="tabular-nums">{row.count}</span>
                  <span className="tabular-nums">{baht(row.total)}</span>
                  <span>
                    <Badge tone={STATE[row.state].tone}>{STATE[row.state].label}</Badge>
                  </span>
                  <span>
                    {row.canReschedule ? (
                      <button type="button" onClick={() => setMoving(row)} className="text-13 text-[#1D4ED8] hover:underline">
                        เลื่อนวันจ่าย
                      </button>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <p className="text-12 text-muted">เลื่อนวันจ่ายต้องกรอกเหตุผล ระบบแจ้งผู้ขอทุกคนในรอบนั้นอัตโนมัติ</p>

      <FinDialog open={moving !== null} title={moving ? `เลื่อนวันจ่าย ${moving.label}` : ''} onClose={() => setMoving(null)}>
        {moving ? <Reschedule row={moving} today={today} onClose={() => setMoving(null)} /> : null}
      </FinDialog>
    </>
  );
}
