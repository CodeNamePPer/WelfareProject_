'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileText, Lock } from 'lucide-react';
import type { Attachment, ClaimDbStatus } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import type { RowTab } from '@/features/hr/queue';
import { Button, Card, PageHeader, RequesterFull, StatusBadge, fieldClass, labelClass, type RequesterDetail } from '@/features/hr/ui';

type Row = { label: string; value: string; strong?: boolean; warn?: boolean };

export type ReviewData = {
  claimNo: string;
  status: ClaimDbStatus;
  statusLabel: string;
  tab: RowTab;
  subtitle: string;
  /** คำขอของ HR ที่หัวหน้า HR กำลังตรวจ (ดีไซน์ HH4) */
  hrClaim?: boolean;
  person: RequesterDetail;
  /** คำขอที่หัวหน้าแผนกยื่นแทน: ใช้วงเงิน จำนวนครั้ง และบัญชีของเจ้าของสิทธิ์ */
  proxy: { by: string; reason: string | null; owner: string; account: string | null } | null;
  entitlement: { title: string; rows: Row[] };
  facts: Row[];
  checks: { ok: boolean; text: string }[];
  blockers: { message: string; action: 'reject' | 'return' | null; reason: string }[];
  attachments: (Attachment & { label: string; locked: boolean })[];
  amountRequested: number;
  amountApproved: number | null;
  financeNote: string | null;
  payNote: string;
  decided: { actor: string; at: string; note: string | null } | null;
  canDecide: boolean;
  readOnlyReason: string | null;
};

const DECIDED_LABEL = { approved: 'อนุมัติโดย', rejected: 'ไม่อนุมัติโดย', revision: 'ส่งกลับโดย' } as const;

type Action = 'hr_approve' | 'hr_return' | 'hr_reject';
const DONE: Record<Action, string> = { hr_approve: 'approved', hr_return: 'revision', hr_reject: 'rejected' };

/** เครื่องหมายถูก/ตกในรายการตรวจ (เส้นเดียวแบบดีไซน์) */
function CheckMark({ ok }: { ok: boolean }) {
  return ok ? (
    <svg role="img" aria-label="ผ่าน" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M5 12l5 5 9-10" />
    </svg>
  ) : (
    <svg role="img" aria-label="ไม่ผ่าน" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" className="shrink-0">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ReviewClient({ data }: { data: ReviewData }) {
  const router = useRouter();
  const [doc, setDoc] = useState(0);
  const [amount, setAmount] = useState(data.amountRequested.toFixed(2));
  const [note, setNote] = useState(() => data.blockers.filter((item) => item.action).map((item) => item.reason).join(' และ '));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);

  const approved = Number(amount.replace(/,/g, ''));
  const adjusted = approved !== data.amountRequested;
  const file = data.attachments[doc];

  async function decide(action: Action) {
    if (busy) return;
    if (action === 'hr_approve') {
      if (!(approved > 0) || approved > data.amountRequested) return setError('ยอดที่อนุมัติต้องมากกว่า 0 และไม่เกินยอดขอเบิก');
      if (adjusted && !note.trim()) return setError('กรุณาระบุเหตุผลที่ปรับยอด ผู้ขอจะเห็นข้อความนี้');
    } else if (!note.trim()) {
      return setError(action === 'hr_return' ? 'กรุณาระบุสิ่งที่ผู้ขอต้องแก้ไข' : 'กรุณาระบุเหตุผลที่ไม่อนุมัติ');
    }
    setBusy(action);
    setError('');
    try {
      // API บันทึกการตัดสินใจพร้อมผู้ทำ เวลา ยอด และเหตุผล ลงประวัติคำขอ (welfare_claim_event)
      const response = await fetch(`/api/claims/${encodeURIComponent(data.claimNo)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim(), ...(action === 'hr_approve' ? { amountApproved: approved } : {}) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      router.push(`/hr/home?tab=${DONE[action]}`);
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        crumbs={[data.hrClaim ? { label: 'คำขอเบิกของ HR', href: '/hr/hr-claims' } : { label: 'คิวคำขอ', href: '/hr/home' }, { label: data.claimNo }]}
        title={data.tab === 'pending' ? `ตรวจคำขอ ${data.claimNo}` : `คำขอ ${data.claimNo}`}
        description={data.subtitle}
        actions={<StatusBadge status={data.status} label={data.hrClaim ? 'รอหัวหน้า HR ตรวจ' : undefined} />}
      />

      <div className="flex flex-wrap items-start gap-4">
        {/* ซ้าย: ผู้ขอและสิทธิ์ของสวัสดิการนี้ */}
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <RequesterFull person={data.person} />
          <Card aria-label={data.entitlement.title} className="flex flex-col gap-2 px-4 py-3.5 text-13">
            <p className="font-semibold">{data.entitlement.title}</p>
            {data.entitlement.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <span className="text-muted">{row.label}</span>
                <span className={cx('text-right', row.strong && 'font-semibold', row.warn && 'text-[#991B1B]')}>{row.value}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* ขวา: รายละเอียด เอกสาร และผลการตรวจ */}
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 text-16 font-semibold">รายละเอียดคำขอ</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
              {data.facts.map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-12 text-muted">{row.label}</dt>
                  <dd className="text-14 break-words">{row.strong ? <b className="font-semibold">{row.value}</b> : row.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-3.5 flex flex-col gap-1.5 text-13">
              {data.checks.map((check) => (
                <li key={check.text} className="flex items-center gap-2">
                  <CheckMark ok={check.ok} />
                  {check.text}
                </li>
              ))}
            </ul>
            {/* ยื่นแทน: สเปกต้องแสดงเหตุผลและใช้วงเงิน/บัญชีของเจ้าของสิทธิ์ (artboard H02 ไม่ได้วาดกรณีนี้) */}
            {data.proxy ? (
              <div className="mt-3.5 rounded-[8px] border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-13 text-[#92400E]">
                <p className="font-medium">ยื่นแทนโดย {data.proxy.by} (หัวหน้าแผนก) · เหตุผล: {data.proxy.reason ?? 'ไม่ได้ระบุ'}</p>
                <p>
                  ใช้วงเงิน จำนวนครั้ง และบัญชีของ {data.proxy.owner}
                  {data.proxy.account ? ` · ${data.proxy.account}` : ' · ยังไม่มีบัญชีหลักในระบบ'}
                </p>
              </div>
            ) : null}
            {data.financeNote ? <p className="mt-3 rounded-[8px] bg-[#E0E7FF] px-3 py-2 text-13 text-[#3730A3]">การเงินส่งกลับ: {data.financeNote}</p> : null}
          </Card>

          {/* เอกสารแนบ: แสดงในหน้า สลับด้วยปุ่มตามประเภทเอกสาร */}
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-16 font-semibold">เอกสารแนบ</h2>
              {data.attachments.length > 0 ? (
                <div role="group" aria-label="เลือกเอกสาร" className="flex flex-wrap gap-1.5">
                  {data.attachments.map((item, index) => (
                    <button
                      key={item.src}
                      type="button"
                      aria-pressed={index === doc}
                      onClick={() => setDoc(index)}
                      title={item.locked ? `${item.name} · เห็นเฉพาะเจ้าของคำขอกับ HR` : item.name}
                      className={cx(
                        'inline-flex h-8 items-center gap-1 rounded-[8px] px-3 text-13',
                        index === doc ? 'border-[1.5px] border-[#1D4ED8] bg-[#EFF6FF] text-[#1E40AF]' : 'border border-[#E2E8F0] bg-white text-ink',
                      )}
                    >
                      {item.locked ? <Lock className="size-3" aria-label="จำกัดสิทธิ์" /> : null}
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex h-[320px] items-center justify-center overflow-auto rounded-[8px] bg-[#EEF1F5] p-5">
              {!file ? (
                <p className="text-13 text-muted">ผู้ขอไม่ได้แนบเอกสาร</p>
              ) : file.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- ไฟล์ผ่าน API ที่ตรวจสิทธิ์ ไม่ผ่าน next/image
                <img src={file.src} alt={`${file.label}: ${file.name}`} className="max-h-full max-w-full bg-white object-contain shadow-[0_1px_3px_rgba(15,23,42,.15)]" />
              ) : /\.pdf$/i.test(file.name) ? (
                <iframe src={file.src} title={`${file.label}: ${file.name}`} className="h-full w-full bg-white" />
              ) : (
                <a href={file.src} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-13 text-[#1E40AF] hover:underline">
                  <FileText className="size-10" strokeWidth={1.5} aria-hidden="true" />
                  {file.name} · {file.size}
                </a>
              )}
            </div>
          </Card>

          {/* ผลการตรวจ */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-16 font-semibold">ผลการตรวจ</h2>
            {data.tab !== 'pending' ? (
              <div className="flex flex-col gap-1 text-13">
                <p>
                  {data.statusLabel}
                  {data.amountApproved !== null ? (
                    <>
                      {' '}
                      · ยอดอนุมัติ <b className="font-semibold tabular-nums">{baht(data.amountApproved)}</b>
                    </>
                  ) : null}
                </p>
                {data.decided ? (
                  <p className="text-muted">
                    {DECIDED_LABEL[data.tab]} {data.decided.actor} · {data.decided.at}
                  </p>
                ) : null}
                {data.decided?.note ? <p className="rounded-[8px] bg-surface px-3 py-2">&ldquo;{data.decided.note}&rdquo;</p> : null}
              </div>
            ) : data.canDecide ? (
              <>
                {data.blockers.length > 0 ? (
                  <ul className="flex flex-col gap-1 rounded-[8px] border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2 text-13 text-[#991B1B]">
                    {data.blockers.map((item) => (
                      <li key={item.message}>• {item.message}</li>
                    ))}
                  </ul>
                ) : null}
                <div>
                  <label htmlFor="approve-amount" className={labelClass}>
                    ยอดที่อนุมัติ (บาท) · ปรับลดได้
                  </label>
                  <input
                    id="approve-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={cx(fieldClass, 'max-w-[240px] text-right')}
                  />
                </div>
                <div>
                  <label htmlFor="review-note" className={labelClass}>
                    เหตุผล / ข้อความถึงผู้ขอ (บังคับเมื่อปรับยอด ส่งกลับ หรือไม่อนุมัติ)
                  </label>
                  <textarea id="review-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={cx(fieldClass, 'h-auto py-2.5')} />
                </div>
                {error ? (
                  <p role="alert" className="text-13 text-[#991B1B]">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled={busy !== null} onClick={() => void decide('hr_approve')}>
                    {busy === 'hr_approve' ? 'กำลังบันทึก...' : 'อนุมัติ'}
                  </Button>
                  <Button variant="revise" disabled={busy !== null} onClick={() => void decide('hr_return')} aria-label="แก้ไข: ส่งกลับให้ผู้ขอแก้ไข">
                    {busy === 'hr_return' ? 'กำลังบันทึก...' : 'แก้ไข'}
                  </Button>
                  <Button variant="reject" disabled={busy !== null} onClick={() => void decide('hr_reject')}>
                    {busy === 'hr_reject' ? 'กำลังบันทึก...' : 'ไม่อนุมัติ'}
                  </Button>
                </div>
                <p className="text-12 text-muted">ปรับยอดได้เฉพาะ HR ผู้ขอจะเห็นยอดใหม่พร้อมเหตุผล การเงินปรับไม่ได้ · {data.payNote}</p>
              </>
            ) : (
              <p className="rounded-[8px] bg-surface px-3 py-2.5 text-13 text-muted">{data.readOnlyReason}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
