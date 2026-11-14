'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, Textarea } from '@/features/hr/ui';

type Decision = 'approve' | 'needs_info' | 'reject';

/** HH2 การตัดสินใจของหัวหน้า HR: อนุมัติและเปิดใช้ / ขอข้อมูลเพิ่ม / ไม่อนุมัติ */
export function DecisionClient({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    if (busy) return;
    if (decision !== 'approve' && !note.trim()) return setError(decision === 'needs_info' ? 'ระบุสิ่งที่ต้องการให้ผู้เสนอแก้' : 'ระบุเหตุผลที่ไม่อนุมัติ');
    setBusy(decision);
    setError('');
    try {
      const response = await fetch(`/api/hr/proposals/${proposalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      notify(decision === 'approve' ? `อนุมัติแล้ว สร้างสวัสดิการ ${body.benefitCode ?? ''}` : decision === 'needs_info' ? 'ส่งกลับให้ผู้เสนอแก้แล้ว' : 'ไม่อนุมัติข้อเสนอแล้ว');
      router.push('/hr/proposals');
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-16 font-semibold">การตัดสินใจ</h2>
      <Textarea label="ความเห็น (บังคับเมื่อขอข้อมูลเพิ่มหรือไม่อนุมัติ)" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      {error ? (
        <p role="alert" className="text-13 text-[#991B1B]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void decide('approve')} disabled={busy !== null}>
          {busy === 'approve' ? 'กำลังบันทึก...' : 'อนุมัติและเปิดใช้'}
        </Button>
        <Button variant="quiet" onClick={() => void decide('needs_info')} disabled={busy !== null} className="!border-[#EA580C] !text-[#9A3412]">
          {busy === 'needs_info' ? 'กำลังบันทึก...' : 'ขอข้อมูลเพิ่ม'}
        </Button>
        <Button variant="quiet" onClick={() => void decide('reject')} disabled={busy !== null} className="!border-[#FCA5A5] !text-[#991B1B]">
          {busy === 'reject' ? 'กำลังบันทึก...' : 'ไม่อนุมัติ'}
        </Button>
      </div>
      <p className="text-12 text-muted">อนุมัติแล้ว: สร้างสวัสดิการใหม่พร้อมวงเงินตามระดับ เปิดให้พนักงานเบิกตั้งแต่วันที่มีผล และบันทึก Log</p>
    </Card>
  );
}
