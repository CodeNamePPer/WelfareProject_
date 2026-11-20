'use client';

import { useState } from 'react';
import { Button, Input } from '@/features/hr/ui';
import { FinDialog, FormError, claimAction } from './ui';

// บันทึกว่าจ่ายแล้ว 1 คำขอ (แท็บ "อนุมัติแล้ว รอจ่าย" และหน้ารายละเอียด F05)
// ใช้คำสั่ง pay ของ API คำขอกลาง: สถานะ awaiting_payment -> paid บันทึกการโอน ประวัติ และแจ้งผู้ขอ

export type PayTarget = {
  claimNo: string;
  name: string;
  amount: string;
  /** "กรุงไทย ••• 7731" หรือ null เมื่อยังไม่มีบัญชีรับเงิน */
  account: string | null;
  advance?: boolean;
};

export function PayClaimDialog({ target, onClose, onPaid }: { target: PayTarget | null; onClose: () => void; onPaid: (claimNo: string) => void }) {
  return (
    <FinDialog open={target !== null} title={target ? `บันทึกจ่ายแล้ว ${target.claimNo}` : ''} onClose={onClose}>
      {/* key: เปิดคำขอใหม่ได้ฟอร์มว่างเสมอ */}
      {target ? <PayForm key={target.claimNo} target={target} onClose={onClose} onPaid={onPaid} /> : null}
    </FinDialog>
  );
}

function PayForm({ target, onClose, onPaid }: { target: PayTarget; onClose: () => void; onPaid: (claimNo: string) => void }) {
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noAccount = target.account === null;

  const submit = async () => {
    if (!ref.trim()) return setError('กรุณาระบุเลขอ้างอิงการโอน');
    setBusy(true);
    setError(null);
    const { error: failure } = await claimAction(target.claimNo, { action: 'pay', transferRef: ref.trim() });
    if (failure) {
      setBusy(false);
      setError(failure);
      return;
    }
    onPaid(target.claimNo);
  };

  return (
    <>
      <p className="text-13 text-ink-soft">
        {target.name} · {target.account ?? 'ยังไม่มีบัญชีรับเงิน'} · <b className="font-semibold text-ink">{target.amount}</b>
      </p>
      {noAccount ? (
        // ชั่วคราว: ยังบันทึกจ่ายได้แม้ไม่มีบัญชีในระบบ (การโอนจะบันทึกบัญชีเป็น "ไม่ระบุ")
        <p className="rounded-[6px] bg-[#FFF7ED] px-2.5 py-2 text-13 text-[#9A3412]">ผู้ขอยังไม่มีบัญชีรับเงินในระบบ ตรวจบัญชีที่โอนให้ถูกต้องก่อนยืนยัน การโอนจะบันทึกบัญชีเป็น “ไม่ระบุ”</p>
      ) : null}
      <Input label="เลขอ้างอิงการโอน" value={ref} onChange={(event) => setRef(event.target.value)} maxLength={200} placeholder="เช่น TRF-251125-001" autoFocus />
      <p className="text-12 text-muted">
        ยืนยันเมื่อโอนเงินเข้าบัญชีผู้ขอแล้วเท่านั้น สถานะจะเปลี่ยนเป็น “จ่ายแล้ว” และแจ้งผู้ขอทันที
        {target.advance ? ' · เบิกล่วงหน้า: ระบบจะเริ่มนับกำหนดแนบใบเสร็จจริงจากวันนี้' : ''}
      </p>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onClose} disabled={busy}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? 'กำลังบันทึก…' : 'ยืนยันจ่ายแล้ว'}
        </Button>
      </div>
    </>
  );
}
