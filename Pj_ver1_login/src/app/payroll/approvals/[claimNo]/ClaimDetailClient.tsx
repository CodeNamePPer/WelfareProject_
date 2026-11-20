'use client';

import { useState } from 'react';
import type { ClaimDbStatus } from '@/lib/claims/types';
import { useToast } from '@/components/ui/Toast';
import { useNavTransition } from '@/lib/useNavTransition';
import { Badge, Button, Card, Input, PageHeader, ReadOnlyInput, RequesterFull, type BadgeTone, type RequesterDetail } from '@/features/hr/ui';
import { FormError, claimAction } from '@/features/finance/ui';
import { PayClaimDialog, type PayTarget } from '@/features/finance/PayClaimDialog';

export type ClaimDetailData = {
  /** คำขอของผู้ใช้เอง: อนุมัติหรือส่งกลับเองไม่ได้ ต้องให้การเงินคนอื่น */
  own: boolean;
  claimNo: string;
  status: ClaimDbStatus;
  statusLabel: string;
  title: string;
  subtitle: string;
  payDateShort: string | null;
  person: RequesterDetail;
  account: string | null;
  amounts: { requested: string; approved: string; transfer: string };
  adjustNote: string | null;
  receipts: { id: string; name: string; isImage: boolean; src: string }[];
  receiptLines: { label: string; amount: string }[];
  history: string | null;
  advance: boolean;
};

const TONE: Partial<Record<ClaimDbStatus, BadgeTone>> = { pending_finance: 'finance', awaiting_payment: 'approved', finance_returned: 'revise', paid: 'paid' };

export function ClaimDetailClient({ data }: { data: ClaimDetailData }) {
  const nav = useNavTransition();
  const { notify } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'return' | null>(null);
  const [shown, setShown] = useState(0);
  const [paying, setPaying] = useState<PayTarget | null>(null);

  const canPay = data.status === 'awaiting_payment' && !data.own;
  const openPay = () => setPaying({ claimNo: data.claimNo, name: data.person.name, amount: `฿${data.amounts.transfer}`, account: data.account, advance: data.advance });
  const paid = (claimNo: string) => {
    notify(`บันทึกจ่าย ${claimNo} แล้ว`);
    // คงหน้าต่างไว้จนหน้ารายการแสดงจริง
    nav.navigate('/payroll/approvals?tab=paid', { refresh: true });
  };

  const canApprove = data.status === 'pending_finance' && !data.own;
  const canReturn = (data.status === 'pending_finance' || data.status === 'awaiting_payment') && !data.own;

  const run = async (action: 'approve' | 'return') => {
    if (action === 'return' && !reason.trim()) {
      setError('กรุณาระบุเหตุผลที่ส่งกลับ HR');
      return;
    }
    setError(null);
    setBusy(action);
    const { error: failure } = await claimAction(data.claimNo, action === 'approve' ? { action: 'finance_approve' } : { action: 'finance_return', note: reason.trim() });
    if (failure) {
      setBusy(null);
      setError(failure);
      return;
    }
    notify(action === 'approve' ? `อนุมัติจ่าย ${data.claimNo} แล้ว` : `ส่ง ${data.claimNo} กลับ HR แล้ว`);
    // คง busy ไว้จนหน้ารายการแสดงจริง
    nav.navigate(`/payroll/approvals?tab=${action === 'approve' ? 'awaiting' : 'returned'}`, { refresh: true });
  };

  const receipt = data.receipts[shown] ?? null;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'รายการอนุมัติ / รอจ่าย', href: '/payroll/approvals' }, { label: data.claimNo }]}
        title={data.title}
        description={data.subtitle}
        actions={<Badge tone={TONE[data.status] ?? 'neutral'}>{data.statusLabel}</Badge>}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
          <RequesterFull person={data.person} />
          <Card className="flex flex-col gap-1.5 px-4 py-3.5 text-13">
            <p className="font-semibold">บัญชีรับเงิน</p>
            <p>{data.account ?? 'ยังไม่มีบัญชีรับเงิน'}</p>
          </Card>
        </div>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 text-16 font-semibold">ยอดเงิน</h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <ReadOnlyInput label="ยอดที่ขอ" value={data.amounts.requested} reason="การเงินปรับยอดไม่ได้" />
              <ReadOnlyInput label="ยอดที่ HR อนุมัติ" value={data.amounts.approved} reason="การเงินปรับยอดไม่ได้" />
              <ReadOnlyInput label="ยอดที่จะโอน" value={data.amounts.transfer} reason="การเงินปรับยอดไม่ได้" />
            </div>
            <p className="mt-2.5 rounded-[6px] bg-[#F8FAFC] px-2.5 py-2 text-13 text-ink-soft">
              {data.adjustNote ? `${data.adjustNote} · ` : ''}การเงินปรับยอดไม่ได้ ถ้าพบปัญหาให้ส่งกลับ HR
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-16 font-semibold">ใบเสร็จ</h2>
            {data.receipts.length > 1 ? (
              <div role="tablist" aria-label="ใบเสร็จ" className="mb-2 flex flex-wrap gap-2">
                {data.receipts.map((file, index) => (
                  <button
                    key={file.id}
                    type="button"
                    role="tab"
                    aria-selected={index === shown}
                    onClick={() => setShown(index)}
                    className={index === shown ? 'h-8 rounded-full border-[1.5px] border-[#1D4ED8] bg-[#EFF6FF] px-3 text-13 text-[#1E40AF]' : 'h-8 rounded-full border border-[#CBD5E1] bg-white px-3 text-13'}
                  >
                    ใบเสร็จ {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex h-[240px] items-center justify-center overflow-hidden rounded-[8px] bg-[#EEF1F5] p-5">
              {receipt ? (
                receipt.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ไฟล์จาก storage ผ่านลิงก์ชั่วคราว
                  <img src={receipt.src} alt={`ใบเสร็จ ${receipt.name}`} className="max-h-full max-w-full bg-white object-contain shadow-[0_1px_3px_rgba(15,23,42,.15)]" />
                ) : (
                  <a href={receipt.src} target="_blank" rel="noreferrer" className="text-13 text-[#1D4ED8] hover:underline">
                    เปิดไฟล์ {receipt.name}
                  </a>
                )
              ) : data.receiptLines.length > 0 ? (
                <div className="w-full max-w-[420px] bg-white px-7 py-6 text-12 leading-[1.6] shadow-[0_1px_3px_rgba(15,23,42,.15)]">
                  {data.receiptLines.map((line) => (
                    <div key={line.label} className="flex justify-between gap-3 border-b border-dotted border-[#CBD5E1] py-1">
                      <span>{line.label}</span>
                      <span className="tabular-nums">{line.amount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-13 text-muted">ไม่มีใบเสร็จแนบ</p>
              )}
            </div>
            <p className="mt-2.5 text-12 text-muted">การเงินเห็นเฉพาะใบเสร็จ เอกสารสุขภาพเห็นเฉพาะผู้ขอและ HR</p>
          </Card>

          {canReturn ? (
            <Card className="flex flex-col gap-3 p-5">
              <Input label="เหตุผล (บังคับเมื่อส่งกลับ HR)" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
              <FormError>{error}</FormError>
              <div className="flex flex-wrap gap-2">
                {canApprove ? (
                  <Button disabled={busy !== null} onClick={() => run('approve')}>
                    {busy === 'approve' ? 'กำลังอนุมัติ…' : `อนุมัติจ่าย${data.payDateShort ? ` รอบ ${data.payDateShort}` : ''}`}
                  </Button>
                ) : null}
                {canPay ? (
                  <Button disabled={busy !== null || paying !== null} onClick={openPay}>
                    บันทึกจ่ายแล้ว
                  </Button>
                ) : null}
                <Button variant="secondary" className="border-[#EA580C] text-[#9A3412] hover:bg-[#FFF7ED]" disabled={busy !== null} onClick={() => run('return')}>
                  {busy === 'return' ? 'กำลังส่งกลับ…' : 'ส่งกลับ HR'}
                </Button>
              </div>
            </Card>
          ) : data.own && data.status === 'pending_finance' ? (
            <Card className="p-5 text-13 text-ink-soft">คำขอนี้เป็นของคุณ อนุมัติจ่ายเองไม่ได้ ต้องให้การเงินคนอื่นอนุมัติ</Card>
          ) : data.own && data.status === 'awaiting_payment' ? (
            <Card className="p-5 text-13 text-ink-soft">คำขอนี้เป็นของคุณ บันทึกจ่ายเองไม่ได้ ต้องให้การเงินคนอื่นบันทึก</Card>
          ) : data.history ? (
            <Card className="p-5 text-13 text-ink-soft">{data.history}</Card>
          ) : null}
        </div>
      </div>

      <PayClaimDialog target={paying} onClose={() => setPaying(null)} onPaid={paid} />
    </>
  );
}
