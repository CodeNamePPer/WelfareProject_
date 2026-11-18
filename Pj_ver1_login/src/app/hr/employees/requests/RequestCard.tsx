'use client';

import { useNavTransition } from '@/lib/useNavTransition';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import type { EditRequestItem } from '@/lib/hr/editRequests';
import { Avatar, Badge, Button, Card, Input } from '@/features/hr/ui';

const thaiDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });

/** การ์ดคำขอแก้ไขข้อมูล 1 รายการ (ดีไซน์ H12) */
export function RequestCard({ request, own }: { request: EditRequestItem; own: boolean }) {
  const nav = useNavTransition();
  const { notify } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    if (busy) return;
    if (decision === 'reject' && !note.trim()) return setError('ระบุข้อความถึงพนักงานเมื่อไม่อนุมัติ');
    setBusy(decision);
    setError('');
    // สำเร็จแล้วการ์ดนี้จะหายไปจากรายการหลังโหลดใหม่: คงปุ่ม "กำลังบันทึก" ไว้จนถึงตอนนั้น
    let done = false;
    try {
      const response = await fetch(`/api/hr/employee-requests/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      notify(decision === 'approve' ? `บันทึกข้อมูลของ ${request.employeeName} แล้ว` : 'ไม่อนุมัติคำขอแล้ว');
      done = true;
      nav.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (!done) setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={request.employeeName} src={request.employeePhotoUrl} />
          <span className="min-w-0">
            <span className="block font-semibold">{request.employeeName}</span>
            <span className="block text-12 text-muted">{request.line}</span>
          </span>
        </div>
        <span className="text-12 text-muted">
          ยื่น {thaiDate(request.submittedAt)} · <Badge tone="review">รอ HR ตรวจ</Badge>
        </span>
      </div>
      <div className="overflow-x-auto rounded-[8px] border border-line">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)] gap-3 bg-[#F8FAFC] px-4 py-2 text-12 font-medium text-muted">
            <span>ข้อมูล</span>
            <span>เดิม</span>
            <span>ขอเปลี่ยนเป็น</span>
          </div>
          {request.changes.map((change) => (
            <div key={change.field} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)] gap-3 border-t border-[#F1F5F9] px-4 py-2.5 text-13">
              <span className="text-muted">{change.label}</span>
              <span className="break-words text-muted line-through">{change.old}</span>
              <span className="break-words font-medium">{change.new}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="rounded-[8px] bg-[#F8FAFC] px-3 py-2.5 text-13">
        <b className="font-semibold">เหตุผลจากพนักงาน:</b> {request.reason}
      </p>
      {request.evidenceName ? (
        <p className="text-13">
          <span className="text-muted">หลักฐาน: </span>
          <a href={`/api/hr/employee-requests/${request.id}/evidence`} target="_blank" rel="noopener noreferrer" className="break-all text-[#1D4ED8] hover:underline">
            {request.evidenceName}
          </a>
        </p>
      ) : null}
      {own ? (
        <p className="text-13 text-muted">คำขอแก้ไขข้อมูลของคุณเอง ต้องให้ HR คนอื่นตรวจ</p>
      ) : (
        <>
          <Input label="ข้อความถึงพนักงาน (บังคับเมื่อไม่อนุมัติ)" value={note} onChange={(event) => setNote(event.target.value)} />
          {error ? (
            <p role="alert" className="text-13 text-[#991B1B]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void decide('approve')} disabled={busy !== null}>
              {busy === 'approve' ? 'กำลังบันทึก...' : 'อนุมัติและบันทึก'}
            </Button>
            <Button variant="reject" onClick={() => void decide('reject')} disabled={busy !== null}>
              {busy === 'reject' ? 'กำลังบันทึก...' : 'ไม่อนุมัติ'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
