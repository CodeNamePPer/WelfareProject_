'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { Badge, Button, Card, PageHeader, RequesterFull, fieldClass, labelClass, type BadgeTone, type RequesterDetail } from '@/features/hr/ui';

export type ReceiptReviewData = {
  claimNo: string;
  subtitle: string;
  status: { label: string; tone: BadgeTone };
  person: RequesterDetail;
  rows: { label: string; value: string }[];
  /** บรรทัดสรุปใต้เส้น (null = ยังไม่มีใบเสร็จ) */
  result: { label: string; value: string; tone: 'info' | 'warn' } | null;
  overLimitNote: string | null;
  attachments: { id: string; name: string; src: string; isImage: boolean }[];
  canReview: boolean;
  canCancel: boolean;
  /** จ่ายเพิ่มได้สูงสุด (null = ใบเสร็จไม่เกินยอดล่วงหน้า ไม่มีช่องยอดจ่ายเพิ่ม) */
  maxExtra: number | null;
  dueLabel: string;
  reviewNote: string | null;
  readOnlyReason: string | null;
};

type Action = 'approve' | 'return' | 'cancel_overdue';

export function ReceiptReviewClient({ data }: { data: ReceiptReviewData }) {
  const router = useRouter();
  const [doc, setDoc] = useState(0);
  const [extra, setExtra] = useState(data.maxExtra !== null ? data.maxExtra.toFixed(2) : '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Action | null>(null);
  const file = data.attachments[doc];
  const extraAmount = Number(extra.replace(/,/g, ''));

  async function decide(action: Action) {
    if (busy) return;
    if (action === 'approve' && data.maxExtra !== null) {
      if (!Number.isFinite(extraAmount) || extra.trim() === '' || extraAmount < 0) return setError('กรุณาระบุยอดจ่ายเพิ่มที่อนุมัติ');
      if (extraAmount > data.maxExtra) return setError(`ยอดจ่ายเพิ่มต้องไม่เกิน ${data.maxExtra.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);
      if (extraAmount !== data.maxExtra && !note.trim()) return setError('กรุณาระบุเหตุผลที่ปรับยอดจ่ายเพิ่ม');
    }
    if (action === 'return' && !note.trim()) return setError('กรุณาระบุสิ่งที่ผู้ขอต้องแนบใหม่');
    setBusy(action);
    setError('');
    try {
      const response = await fetch(`/api/hr/advances/${encodeURIComponent(data.claimNo)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim(), ...(action === 'approve' && data.maxExtra !== null ? { extraAmount } : {}) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
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
        crumbs={[{ label: 'คิวคำขอ', href: '/hr/home' }, { label: data.claimNo }]}
        title={`ตรวจใบเสร็จเบิกล่วงหน้า ${data.claimNo}`}
        description={data.subtitle}
        actions={<Badge tone={data.status.tone}>{data.status.label}</Badge>}
      />
      <div className="flex flex-wrap items-start gap-4">
        <RequesterFull person={data.person} className="min-w-0 flex-[1_1_280px]" />
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card className="flex flex-col gap-2 p-5 text-14">
            <h2 className="mb-1.5 text-16 font-semibold text-ink">สรุปยอด</h2>
            {data.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <span className="text-muted">{row.label}</span>
                <span className="tabular-nums">{row.value}</span>
              </div>
            ))}
            {data.result ? (
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                <span>{data.result.label}</span>
                <span className={cx('tabular-nums', data.result.tone === 'info' ? 'text-[#1E40AF]' : 'text-[#9A3412]')}>{data.result.value}</span>
              </div>
            ) : null}
            {data.overLimitNote ? <p className="text-12 text-[#9A3412]">{data.overLimitNote}</p> : null}
            {data.reviewNote ? <p className="text-12 text-muted">หมายเหตุจาก HR: {data.reviewNote}</p> : null}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-16 font-semibold text-ink">ใบเสร็จและเอกสารแนบ</h2>
            {data.attachments.length === 0 ? (
              <p className="text-13 text-muted">ยังไม่มีเอกสารแนบ</p>
            ) : (
              <>
                {data.attachments.length > 1 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {data.attachments.map((item, index) => (
                      <Button key={item.id} size="sm" variant={index === doc ? 'secondary' : 'quiet'} aria-pressed={index === doc} onClick={() => setDoc(index)}>
                        {item.name}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <div className="h-[300px] overflow-auto rounded-[8px] bg-[#EEF1F5] p-5">
                  {file.isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ไฟล์แนบส่งผ่าน API ที่ตรวจสิทธิ์ ไม่ผ่าน next/image
                    <img src={file.src} alt={file.name} className="mx-auto max-w-full bg-white shadow-[0_1px_3px_rgba(15,23,42,.15)]" />
                  ) : (
                    <p className="text-center text-13 text-ink-soft">
                      <a href={file.src} target="_blank" rel="noreferrer" className="text-[#1D4ED8] hover:underline">
                        เปิด {file.name} ในแท็บใหม่
                      </a>
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>

          {data.canReview ? (
            <Card className="flex flex-col gap-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {data.maxExtra !== null ? (
                  <div>
                    <label htmlFor="advance-extra" className={labelClass}>
                      ยอดจ่ายเพิ่มที่อนุมัติ (บาท) <span className="text-[#B3261E]">*</span>
                    </label>
                    <input id="advance-extra" inputMode="decimal" value={extra} onChange={(event) => setExtra(event.target.value)} className={cx(fieldClass, 'text-right tabular-nums')} />
                  </div>
                ) : null}
                <div className={data.maxExtra === null ? 'sm:col-span-2' : undefined}>
                  <label htmlFor="advance-note" className={labelClass}>
                    {data.maxExtra !== null ? 'เหตุผลเมื่อปรับยอด' : 'เหตุผล (บังคับเมื่อส่งกลับ)'}
                  </label>
                  <input id="advance-note" value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} />
                </div>
              </div>
              {error ? (
                <p role="alert" className="text-13 text-[#991B1B]">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => decide('approve')} disabled={busy !== null}>
                  {busy === 'approve' ? 'กำลังบันทึก…' : 'ใบเสร็จถูกต้อง ส่งการเงิน'}
                </Button>
                <Button variant="secondary" className="!border-[#EA580C] !text-[#9A3412]" onClick={() => decide('return')} disabled={busy !== null}>
                  {busy === 'return' ? 'กำลังบันทึก…' : 'ส่งกลับให้แนบใหม่'}
                </Button>
              </div>
              <p className="text-12 text-muted">ส่งกลับแล้ว ผู้ขอยังต้องแนบใหม่ภายใน {data.dueLabel} เกินกำหนดระบบยกเลิกรายการ</p>
            </Card>
          ) : null}

          {data.canCancel ? (
            <Card className="flex flex-col gap-3 p-5">
              <p className="text-13 text-ink-soft">เกินกำหนดแนบใบเสร็จ ({data.dueLabel}) แล้ว ยกเลิกรายการได้ ผู้ขอต้องคืนยอดล่วงหน้าทั้งหมด</p>
              {error ? (
                <p role="alert" className="text-13 text-[#991B1B]">
                  {error}
                </p>
              ) : null}
              <div>
                <Button variant="reject" onClick={() => decide('cancel_overdue')} disabled={busy !== null}>
                  {busy === 'cancel_overdue' ? 'กำลังบันทึก…' : 'ยกเลิกรายการ'}
                </Button>
              </div>
            </Card>
          ) : null}

          {data.readOnlyReason ? <p className="text-12 text-muted">{data.readOnlyReason}</p> : null}
        </div>
      </div>
    </>
  );
}
