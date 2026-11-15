'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { baht, thaiDate } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Textarea, fieldClass, type BadgeTone } from '@/features/hr/ui';
import { FinDialog, FormError, financeAction } from '@/features/finance/ui';
import { DEFAULT_PAY_SETTINGS, MAX_CUTOFF_DAYS, MAX_MONTH_OFFSET, cutoffDateOf, monthOffsetLabel, resolvePayDate, roundSetting, validatePaySettings, type PaySettings } from '@/features/payroll/lib/pay-settings';
import { CalendarPicker, thaiMonthLong, type CalendarValue } from '@/features/payroll/ui/CalendarPicker';
import { Check } from 'lucide-react';
import type { RoundState } from '@/lib/payroll/finance';

export type RoundRow = {
  key: string;
  year: number;
  month: number;
  roundNo: 1 | 2;
  label: string;
  period: string;
  payDate: string;
  payDateIso: string;
  /** วันจ่ายตามค่าตั้งประจำ (ใช้บอกว่ารอบนี้ถูกเลื่อนจากวันไหน) */
  scheduled: string;
  moved: boolean;
  cutoff: string;
  count: number;
  total: number;
  state: RoundState;
  /** ผู้ขอที่ยังรอเงินในรอบนี้ (ได้รับแจ้งเมื่อเลื่อนวันจ่าย) */
  people: number;
  canReschedule: boolean;
};

type Settings = PaySettings & { cutoffDays: number };

const STATE: Record<RoundState, { tone: BadgeTone; label: string; hint: string }> = {
  open: { tone: 'review', label: 'เปิดอยู่', hint: 'อนุมัติคำขอเข้ารอบนี้ได้' },
  not_started: { tone: 'neutral', label: 'ยังไม่เริ่ม', hint: 'ยังไม่ถึงช่วงยื่น' },
  closed: { tone: 'finance', label: 'ปิดรอบแล้ว', hint: 'รอโอนเงิน' },
  paid: { tone: 'paid', label: 'จ่ายแล้ว', hint: '' },
};

const REASONS = ['ตรงกับวันหยุดนักขัตฤกษ์', 'ตรงกับวันหยุดสุดสัปดาห์', 'ระบบธนาคารขัดข้อง', 'รอเอกสารอนุมัติงบประมาณ'];

const TZ = 'Asia/Bangkok';
const atNoon = (iso: string) => new Date(`${iso}T12:00:00+07:00`);
const weekday = (iso: string) => atNoon(iso).toLocaleDateString('th-TH', { weekday: 'long', timeZone: TZ });
const isWeekend = (iso: string) => [0, 6].includes(atNoon(iso).getUTCDay());
const daysBetween = (from: string, to: string) => Math.round((atNoon(to).getTime() - atNoon(from).getTime()) / 86_400_000);

// ช่องแบบอยู่ในประโยค: ตัด w-full ของ fieldClass ออก (cx ไม่ได้ merge คลาสที่ชนกัน)
const inlineField = fieldClass.replace('w-full', '');

// จอแคบ: ข้อมูลเรียงลงในคอลัมน์ซ้าย ปุ่มอยู่ขวา · จอกว้าง: ตาราง 5 คอลัมน์
const COLS = 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_110px_minmax(0,1fr)_130px]';

function Reschedule({ row, today, settings, onClose }: { row: RoundRow; today: string; settings: Settings; onClose: () => void }) {
  const cutoffDays = settings.cutoffDays;
  const router = useRouter();
  const { notify } = useToast();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const diff = date ? daysBetween(row.payDateIso, date) : 0;
  const newCutoff = date ? cutoffDateOf(date, settings) : '';

  const submit = async () => {
    if (!date) return setError('กรุณาเลือกวันจ่ายใหม่');
    if (date === row.payDateIso) return setError('วันจ่ายใหม่ต้องไม่ตรงกับวันจ่ายเดิม');
    if (!reason.trim()) return setError('กรุณาระบุเหตุผล');
    setBusy(true);
    const { error: failure, data } = await financeAction({ type: 'reschedule_round', key: row.key, date, reason: reason.trim() });
    setBusy(false);
    if (failure) return setError(failure);
    notify(`เลื่อนวันจ่าย${row.label}เป็น ${thaiDate(date)} แล้ว · แจ้งผู้ขอ ${Number(data.notified ?? 0)} คน`);
    onClose();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-13 font-medium text-ink-soft">วันจ่ายเดิม</p>
          <p className="rounded-[8px] bg-[#F8FAFC] px-3 py-2.5">
            <span className="block font-semibold">{row.payDate}</span>
            <span className="text-12 text-muted">วัน{weekday(row.payDateIso)}</span>
          </p>
        </div>
        <div>
          <label htmlFor="f7-date" className="mb-1.5 block text-13 font-medium text-ink-soft">
            วันจ่ายใหม่ <span className="text-[#B3261E]">*</span>
          </label>
          <input
            id="f7-date"
            type="date"
            min={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setError(null);
            }}
            className={cx(fieldClass, 'w-full')}
            required
          />
          {date ? (
            <p className={cx('mt-1 text-12', isWeekend(date) ? 'text-[#B45309]' : 'text-muted')}>
              วัน{weekday(date)}
              {isWeekend(date) ? ' · เป็นวันหยุดสุดสัปดาห์ ธนาคารอาจไม่โอนในวันนี้' : ''}
            </p>
          ) : null}
        </div>
      </div>

      {date && date !== row.payDateIso ? (
        <ul className="flex flex-col gap-1 rounded-[8px] border border-line px-3 py-2.5 text-13">
          <li>
            <span className="text-muted">เลื่อน</span> <span className="font-medium">{diff > 0 ? `ช้าลง ${diff} วัน` : `เร็วขึ้น ${-diff} วัน`}</span>
          </li>
          <li>
            <span className="text-muted">ปิดรอบใหม่</span> <span className="font-medium">{thaiDate(newCutoff)}</span>
            <span className="text-muted"> (ก่อนวันจ่าย {cutoffDays} วัน)</span>
            {newCutoff < today ? <span className="block text-12 text-[#B45309]">วันปิดรอบผ่านมาแล้ว รอบนี้จะปิดทันที อนุมัติคำขอเพิ่มเข้ารอบนี้ไม่ได้</span> : null}
          </li>
        </ul>
      ) : null}

      <div className="flex flex-col gap-2">
        <Textarea
          label={<>เหตุผล (ผู้ขอจะเห็นข้อความนี้) <span className="text-[#B3261E]">*</span></>}
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          required
        />
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setReason(text)}
              className={cx('rounded-full border px-2.5 py-1 text-12', reason === text ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-line text-ink-soft hover:bg-[#F8FAFC]')}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-[8px] bg-[#FFFBEB] px-3 py-2.5 text-13 text-[#92400E]">
        {row.people > 0 ? `ระบบจะแจ้งวันจ่ายใหม่ให้ผู้ขอ ${row.people} คนในรอบนี้ทันที` : 'ยังไม่มีผู้ขอในรอบนี้ คำขอที่เข้ารอบภายหลังจะใช้วันจ่ายใหม่'}
      </p>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={busy || !date}>
          {busy ? 'กำลังบันทึก…' : 'ยืนยันเลื่อนวันจ่าย'}
        </Button>
      </div>
    </div>
  );
}

function RoundLine({ row, action }: { row: RoundRow; action?: ReactNode }) {
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-[#F1F5F9] px-5 py-3.5 lg:gap-y-3', COLS)}>
      <span className="min-w-0">
        <span className="block font-medium">{row.label}</span>
        <span className="text-12 text-muted">ยื่น {row.period}</span>
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">
          {row.payDate}
          <span className="ml-1.5 text-12 font-normal text-muted">{weekday(row.payDateIso)}</span>
        </span>
        <span className="text-12 text-muted">
          ปิดรอบ {row.cutoff}
          {row.moved ? <span className="ml-1.5 text-[#B45309]">· เลื่อนจาก {row.scheduled}</span> : null}
        </span>
      </span>
      <span>
        <Badge tone={STATE[row.state].tone}>{STATE[row.state].label}</Badge>
      </span>
      <span className="text-13 tabular-nums">
        <span className="lg:block">{row.count} รายการ</span>
        <span className="text-muted"><span className="lg:hidden"> · </span>{baht(row.total)}</span>
      </span>
      <span className="col-start-2 row-span-4 row-start-1 flex justify-end lg:col-start-auto lg:row-span-1 lg:row-start-auto">{action}</span>
    </div>
  );
}

function Head({ last }: { last: string }) {
  return (
    <div className={cx('hidden gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted lg:grid', COLS)}>
      <span>รอบ</span>
      <span>วันจ่าย</span>
      <span>สถานะ</span>
      <span>คำขอในรอบ</span>
      <span className="text-right">{last}</span>
    </div>
  );
}

const sameSettings = (a: Settings, b: Settings) =>
  a.round1PayDay === b.round1PayDay && a.round1MonthOffset === b.round1MonthOffset && a.round2PayDay === b.round2PayDay && a.round2MonthOffset === b.round2MonthOffset && a.cutoffDays === b.cutoffDays;

/** "วันที่ 28 ของเดือนเดียวกัน" */
const describeRound = (s: Settings, round: 1 | 2) => {
  const { day, offset } = roundSetting(s, round);
  return `วันที่ ${day} ของ${monthOffsetLabel(offset)}`;
};

const linkClass = 'text-primary-600 underline-offset-2 hover:underline';

// การ์ด "ตั้งค่าการจ่ายเงิน": เลือกวันจ่ายของรอบที่ 1 / 2 จากปฏิทิน (ตัวอย่าง = คำขอที่ยื่นเดือนนี้)
function ScheduleSettings({ settings, upcoming, today }: { settings: Settings; upcoming: RoundRow[]; today: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const base = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const defaults: Settings = { ...DEFAULT_PAY_SETTINGS, cutoffDays: DEFAULT_PAY_SETTINGS.cutoffDays ?? 5 };
  const errors = validatePaySettings(draft);
  const hasError = Boolean(errors.round1 || errors.round2 || errors.cutoff);
  const dirty = !sameSettings(draft, settings);
  const isDefault = sameSettings(draft, defaults);

  // รอบที่วันจ่ายจะเปลี่ยนเมื่อบันทึก: ยังไม่ปิดรอบ และไม่เคยถูกเลื่อน
  const affected = upcoming
    .filter((row) => (row.state === 'open' || row.state === 'not_started') && !row.moved)
    .map((row) => ({ row, date: resolvePayDate(row.year, row.month, row.roundNo, draft) }))
    .filter(({ row, date }) => date !== row.payDateIso);

  const setRound = (round: 1 | 2, value: CalendarValue) => {
    setError(null);
    setDraft((current) => ({ ...current, [`round${round}PayDay`]: value.day, [`round${round}MonthOffset`]: value.offset }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/payroll/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      else {
        notify('บันทึกการตั้งค่าการจ่ายเงินแล้ว');
        router.refresh();
      }
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    setConfirming(false);
    setSaving(false);
  };

  return (
    <section aria-label="ตั้งค่าการจ่ายเงิน" className="flex flex-col gap-4 rounded-[12px] border border-primary-600/30 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-16 font-semibold text-ink">ตั้งค่าการจ่ายเงิน</h2>
          <p className={cx('text-13', dirty ? 'text-[#92400E]' : 'text-muted')}>
            {dirty ? (
              <>
                ยังไม่บันทึก · วันจ่ายจะเปลี่ยน <b className="tabular-nums">{affected.length}</b> รอบ{' '}
                <button type="button" onClick={() => setDraft(settings)} className={linkClass}>
                  ยกเลิก
                </button>
              </>
            ) : (
              <>
                ดูรอบและกำหนดจ่ายของแต่ละคำขอ ได้ที่ตาราง{' '}
                <a href="#upcoming-rounds" className={linkClass}>
                  รอบที่กำลังจะจ่าย
                </a>
              </>
            )}
            {!isDefault ? (
              <>
                {' · '}
                <button type="button" onClick={() => setDraft(defaults)} className={linkClass}>
                  คืนค่าเริ่มต้น
                </button>
              </>
            ) : null}
          </p>
        </div>
        <Button onClick={() => setConfirming(true)} disabled={!dirty || hasError} className="w-full sm:w-auto">
          <Check className="size-4" aria-hidden="true" />
          บันทึกการตั้งค่า
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {([1, 2] as const).map((round) => {
          const { day, offset } = roundSetting(draft, round);
          const fieldError = round === 1 ? errors.round1 : errors.round2;
          return (
            <fieldset key={round} className="flex min-w-0 flex-col gap-1.5">
              <legend className="mb-1.5 text-13 font-medium text-ink-soft">
                รอบที่ {round} จ่าย <span className="font-normal text-muted">(คำขอที่ยื่น {thaiMonthLong(base.year, base.month)})</span>
              </legend>
              <CalendarPicker
                label={`รอบที่ ${round} จ่าย`}
                baseYear={base.year}
                baseMonth={base.month}
                minOffset={round === 1 ? 0 : 1}
                maxOffset={MAX_MONTH_OFFSET}
                value={{ offset, day }}
                invalid={Boolean(fieldError)}
                // วันก่อนปิดรับคำขอเลือกไม่ได้: รอบที่ 1 ปิดวันที่ 15 รอบที่ 2 ปิดสิ้นเดือน
                isDisabled={(value) => validatePaySettings({ ...draft, [`round${round}PayDay`]: value.day, [`round${round}MonthOffset`]: value.offset })[`round${round}`] !== undefined}
                onChange={(value) => setRound(round, value)}
              />
              <p className="text-12 text-muted">= {describeRound(draft, round)}</p>
              {fieldError ? (
                <p role="alert" className="text-12 text-[#B3261E]">
                  {fieldError}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-3 text-13">
        <label htmlFor="pay-cutoff" className="text-ink-soft">
          ปิดรอบก่อนวันจ่าย
        </label>
        <input
          id="pay-cutoff"
          inputMode="numeric"
          value={String(draft.cutoffDays)}
          onChange={(event) => {
            setError(null);
            setDraft((current) => ({ ...current, cutoffDays: Number(event.target.value.replace(/\D/g, '').slice(0, 2) || 0) }));
          }}
          className={cx(inlineField, 'h-[36px] w-[56px] text-center')}
        />
        <span className="text-ink-soft">วัน</span>
        <span className={cx('text-12', errors.cutoff ? 'text-[#B3261E]' : 'text-muted')}>
          {errors.cutoff ?? `หลังวันปิดรอบ คำขอที่อนุมัติจะไปจ่ายรอบถัดไป (0–${MAX_CUTOFF_DAYS} วัน)`}
        </span>
      </div>

      <FormError>{error}</FormError>

      <FinDialog open={confirming} title="ยืนยันการตั้งค่าการจ่ายเงิน" onClose={() => setConfirming(false)}>
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2 text-13">
            {([1, 2] as const).map((round) => (
              <div key={round} className="flex justify-between gap-4">
                <dt className="text-muted">รอบที่ {round}</dt>
                <dd className="font-medium">จ่าย{describeRound(draft, round)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">ปิดรอบ</dt>
              <dd className="font-medium">ก่อนวันจ่าย {draft.cutoffDays} วัน</dd>
            </div>
          </dl>
          <div className="rounded-[8px] bg-[#F8FAFC] px-3 py-2.5 text-13">
            {affected.length > 0 ? (
              <>
                <p className="font-medium">วันจ่ายของรอบเหล่านี้จะเปลี่ยน</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {affected.map(({ row, date }) => (
                    <li key={row.key}>
                      {row.label}: <span className="text-muted line-through">{row.payDate}</span> → <span className="font-medium">{thaiDate(date)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>ไม่มีรอบที่เปิดอยู่ตอนนี้ที่วันจ่ายเปลี่ยน ค่าใหม่จะใช้กับรอบถัดไป</p>
            )}
            <p className="mt-1 text-12 text-muted">รอบที่ปิดแล้ว หรือที่เคยเลื่อนวันจ่ายไว้ จะคงวันเดิม</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setConfirming(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </FinDialog>
    </section>
  );
}

export function RoundsClient({ settings, upcoming, past, today }: { settings: Settings; upcoming: RoundRow[]; past: RoundRow[]; today: string }) {
  const [moving, setMoving] = useState<RoundRow | null>(null);
  const [showPast, setShowPast] = useState(false);

  return (
    <>
      <PageHeader title="ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย" description="เลื่อนวันจ่ายเฉพาะรอบได้จากตารางด้านล่าง หรือเปลี่ยนวันจ่ายประจำของทุกรอบในส่วน “ตั้งค่าการจ่ายเงิน”" />

      <Card id="upcoming-rounds">
        <CardHeader title="รอบที่กำลังจะจ่าย" description="ต้องการเปลี่ยนวันจ่ายเฉพาะรอบ (เช่น ตรงวันหยุด) กด “เลื่อนวันจ่าย” ระบบแจ้งผู้ขอในรอบนั้นอัตโนมัติ" />
        <div className="mt-3">
          <div>
            <Head last="" />
            {upcoming.length === 0 ? (
              <EmptyState>ยังไม่มีรอบที่กำลังจะจ่าย</EmptyState>
            ) : (
              upcoming.map((row) => (
                <RoundLine
                  key={row.key}
                  row={row}
                  action={
                    row.canReschedule ? (
                      <Button size="sm" variant="secondary" onClick={() => setMoving(row)}>
                        เลื่อนวันจ่าย
                      </Button>
                    ) : null
                  }
                />
              ))
            )}
          </div>
        </div>
      </Card>

      <ScheduleSettings settings={settings} upcoming={upcoming} today={today} />

      {past.length > 0 ? (
        <Card>
          <CardHeader
            title="รอบที่ผ่านมา"
            description={`${past.length} รอบล่าสุด`}
            action={
              <Button size="sm" variant="quiet" onClick={() => setShowPast((open) => !open)} aria-expanded={showPast}>
                {showPast ? 'ซ่อน' : 'แสดง'}
              </Button>
            }
            className="pb-4"
          />
          {showPast ? (
            <div>
              <div>
                <Head last="" />
                {past.map((row) => (
                  <RoundLine key={row.key} row={row} />
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <FinDialog open={moving !== null} title={moving ? `เลื่อนวันจ่าย ${moving.label}` : ''} onClose={() => setMoving(null)}>
        {moving ? <Reschedule row={moving} today={today} settings={settings} onClose={() => setMoving(null)} /> : null}
      </FinDialog>
    </>
  );
}
