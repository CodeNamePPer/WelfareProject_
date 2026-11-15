'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { downloadExcel } from '@/features/payroll/lib/export-excel';
import type { Crumb } from '@/components/ui/Breadcrumb';
import { Button, Card, EmptyState, Input, PageHeader, RequesterCompact, StatRow, StatTile } from '@/features/hr/ui';
import type { PayoutRow } from '@/lib/payroll/payout';
import { parseCsv } from './csv';
import { FinDialog, FormError, financeAction } from './ui';

// ตารางบันทึกการโอนของรอบ (ดีไซน์ F06) · readOnly = รายการของรอบในข้อมูลย้อนหลัง (F08)

const COLS = 'grid-cols-[minmax(0,2fr)_140px_minmax(0,1.2fr)_100px_130px_minmax(0,1.2fr)]';
const HEADERS = ['เลขคำขอ', 'รหัสพนักงาน', 'ชื่อผู้รับ', 'ธนาคาร', 'เลขบัญชี', 'ยอดเงิน', 'ผล', 'เลขอ้างอิง / หมายเหตุ'];
const RESULT_TEXT = { success: 'สำเร็จ', failed: 'ไม่สำเร็จ', none: '' } as const;

function ResultPill({ result }: { result: PayoutRow['result'] }) {
  if (result === 'none') return <span className="justify-self-start rounded-[999px] bg-slate-100 px-2.5 py-px text-12 text-slate-600">ยังไม่บันทึก</span>;
  return (
    <span className={cx('justify-self-start rounded-[999px] px-2.5 py-px text-12', result === 'success' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]')}>
      {result === 'success' ? 'โอนสำเร็จ' : 'โอนไม่สำเร็จ'}
    </span>
  );
}

function RecordForm({ row, onClose }: { row: PayoutRow; onClose: () => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const [result, setResult] = useState<'success' | 'failed'>('success');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return setError(result === 'success' ? 'กรุณาระบุเลขอ้างอิงการโอน' : 'กรุณาระบุสาเหตุที่โอนไม่สำเร็จ');
    setBusy(true);
    const { error: failure } = await financeAction({ type: 'payment_result', claimNo: row.claimNo, result, ref: text.trim(), reason: text.trim() });
    setBusy(false);
    if (failure) return setError(failure);
    notify(`บันทึกผลการโอน ${row.claimNo} แล้ว`);
    onClose();
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-13 text-ink-soft">
        {row.person.name} · {row.account} · <b className="font-semibold">{baht(row.amount)}</b>
      </p>
      <div role="radiogroup" aria-label="ผลการโอน" className="flex gap-2">
        {(['success', 'failed'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={result === value}
            onClick={() => setResult(value)}
            className={cx('h-9 rounded-full px-3.5 text-13', result === value ? 'border-[1.5px] border-[#1D4ED8] bg-[#EFF6FF] text-[#1E40AF]' : 'border border-[#CBD5E1] bg-white')}
          >
            {value === 'success' ? 'โอนสำเร็จ' : 'โอนไม่สำเร็จ'}
          </button>
        ))}
      </div>
      <Input label={result === 'success' ? 'เลขอ้างอิงการโอน' : 'สาเหตุ'} value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={result === 'success' ? 'เช่น TRF-251125-001' : 'เช่น บัญชีปิดแล้ว'} />
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'บันทึกผล'}
        </Button>
      </div>
    </div>
  );
}

export function PayoutTable({
  title,
  subtitle,
  crumbs,
  rows,
  fileName,
  nextPayDate,
  readOnly = false,
}: {
  title: string;
  subtitle: string;
  crumbs?: Crumb[];
  rows: PayoutRow[];
  fileName: string;
  nextPayDate: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const upload = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState<PayoutRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const sum = (list: PayoutRow[]) => list.reduce((total, row) => total + row.amount, 0);
  const success = rows.filter((row) => row.result === 'success');
  const failed = rows.filter((row) => row.result === 'failed');
  const none = rows.filter((row) => row.result === 'none');

  const download = () =>
    downloadExcel(
      fileName,
      HEADERS.map((header, index) => ({
        header,
        value: (row: PayoutRow) =>
          [row.claimNo, row.person.code, row.person.name, row.bankCode, row.accountMasked, row.amount, RESULT_TEXT[row.result], row.note ?? ''][index] as string | number,
      })),
      rows,
    );

  // อ่านไฟล์ที่ดาวน์โหลดไปแล้วกรอกคอลัมน์ "ผล" (สำเร็จ / ไม่สำเร็จ) กับ "เลขอ้างอิง / หมายเหตุ" กลับมา
  const onUpload = async (file: File) => {
    const table = parseCsv(await file.text());
    const header = table[0]?.map((cell) => cell.trim()) ?? [];
    const col = (name: string) => header.indexOf(name);
    const [no, result, note] = [col('เลขคำขอ'), col('ผล'), col('เลขอ้างอิง / หมายเหตุ')];
    if (no < 0 || result < 0 || note < 0) {
      notify('ไฟล์ไม่ตรงแบบ ต้องมีคอลัมน์ เลขคำขอ, ผล และ เลขอ้างอิง / หมายเหตุ (ดาวน์โหลดไฟล์ธนาคารเป็นแบบ)');
      return;
    }
    const pending = new Map(none.map((row) => [row.claimNo, row]));
    type Task = { claimNo: string; result: 'success' | 'failed'; ref?: string; reason?: string };
    const tasks = table.slice(1).flatMap((cells): Task[] => {
      const claimNo = cells[no]?.trim();
      const outcome = cells[result]?.trim();
      const text = cells[note]?.trim() ?? '';
      if (!claimNo || !pending.has(claimNo) || !text) return [];
      if (outcome === 'สำเร็จ') return [{ claimNo, result: 'success', ref: text }];
      if (outcome === 'ไม่สำเร็จ') return [{ claimNo, result: 'failed', reason: text }];
      return [];
    });
    if (tasks.length === 0) {
      notify('ไม่พบผลการโอนใหม่ในไฟล์ (บันทึกเฉพาะรายการที่ยังไม่บันทึก)');
      return;
    }
    setBusy('upload');
    let done = 0;
    let failure: string | null = null;
    for (const task of tasks) {
      const { error } = await financeAction({ type: 'payment_result', ...task });
      if (error) {
        failure = `${task.claimNo}: ${error}`;
        break;
      }
      done += 1;
    }
    setBusy(null);
    notify(failure ? `บันทึกแล้ว ${done} รายการ · ${failure}` : `บันทึกผลการโอนแล้ว ${done} รายการ`);
    router.refresh();
  };

  const carry = async (row: PayoutRow) => {
    setBusy(row.claimNo);
    const { error } = await financeAction({ type: 'carry_over', claimNo: row.claimNo });
    setBusy(null);
    notify(error ?? `ยก ${row.claimNo} ไปโอนรอบถัดไปแล้ว`);
    router.refresh();
  };

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={title}
        description={subtitle}
        actions={
          rows.length > 0 ? (
            <>
              <Button variant="quiet" onClick={download}>
                ดาวน์โหลดไฟล์ธนาคาร
              </Button>
              {readOnly ? null : (
                <>
                  <Button onClick={() => upload.current?.click()} disabled={busy !== null || none.length === 0}>
                    {busy === 'upload' ? 'กำลังบันทึก…' : 'อัปโหลดผลการโอน'}
                  </Button>
                  <input
                    ref={upload}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void onUpload(file);
                    }}
                  />
                </>
              )}
            </>
          ) : null
        }
      />

      <StatRow>
        <StatTile label="โอนสำเร็จ" value={String(success.length)} note={baht(sum(success))} tone="success" />
        <StatTile label="โอนไม่สำเร็จ" value={String(failed.length)} note={failed.length > 0 ? `${baht(sum(failed))} · ต้องแก้บัญชี` : ''} tone={failed.length > 0 ? 'danger' : 'default'} />
        <StatTile label="ยังไม่บันทึก" value={String(none.length)} note={none.length > 0 ? baht(sum(none)) : ''} />
      </StatRow>

      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span>ผู้รับ</span>
              <span>คำขอ</span>
              <span>บัญชี</span>
              <span className="text-right">ยอด</span>
              <span>ผล</span>
              <span>เลขอ้างอิง / หมายเหตุ</span>
            </div>
            {rows.length === 0 ? (
              <EmptyState>ยังไม่มีรายการที่การเงินอนุมัติในรอบนี้</EmptyState>
            ) : (
              rows.map((row) => (
                <div key={row.claimNo} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3', COLS, row.result === 'failed' && 'bg-[#FEF2F2]')}>
                  <RequesterCompact person={row.person} />
                  <span className="text-13">{row.claimNo}</span>
                  <span className="text-13">{row.account}</span>
                  <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                  <ResultPill result={row.result} />
                  <span className="flex flex-wrap items-center gap-x-2 text-13 text-ink-soft">
                    {row.note ? <span>{row.note}</span> : null}
                    {!readOnly && row.result === 'none' ? (
                      <button type="button" onClick={() => setRecording(row)} className="text-[#1D4ED8] hover:underline">
                        บันทึกผล
                      </button>
                    ) : null}
                    {!readOnly && row.canCarry ? (
                      <button type="button" disabled={busy !== null} onClick={() => carry(row)} className="text-[#1D4ED8] hover:underline disabled:opacity-50">
                        {busy === row.claimNo ? 'กำลังยก…' : 'โอนใหม่รอบถัดไป'}
                      </button>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {readOnly ? null : (
        <p className="text-12 text-muted">
          โอนไม่สำเร็จ: แจ้งผู้ขอให้แก้บัญชีรับเงิน แล้วยกไปโอนรอบถัดไป{nextPayDate ? ` (${nextPayDate})` : ''} · ระบบแจ้งผู้ขอทุกคนเมื่อบันทึกผล
        </p>
      )}

      <FinDialog open={recording !== null} title={recording ? `บันทึกผลการโอน ${recording.claimNo}` : ''} onClose={() => setRecording(null)}>
        {recording ? <RecordForm row={recording} onClose={() => setRecording(null)} /> : null}
      </FinDialog>
    </>
  );
}
