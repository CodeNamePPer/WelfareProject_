'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import type { ProposalInput } from '@/lib/hr/proposals';
import { Avatar, Button, Card, Input, ReadOnlyInput, fieldClass, labelClass } from '@/features/hr/ui';

type Level = { id: string; code: string; name: string };

const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.replace(/,/g, '')));
const thaiDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
// ช่องที่หัวหน้า HR มักขอให้แก้ (ดีไซน์ H14 กรอบสีส้ม)
const fixClass = '!border-2 !border-[#EA580C]';

/** H14 แก้ข้อเสนอหลังหัวหน้า HR ขอข้อมูลเพิ่ม: ชื่อและหมวดล็อก แก้วงเงิน รายละเอียด จำนวนครั้ง แล้วส่งกลับ */
export function ReviseClient({
  proposal,
  request,
  levels,
}: {
  proposal: { id: string; input: ProposalInput };
  request: { by: string; at: string; note: string } | null;
  levels: Level[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const start = proposal.input;
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(levels.map((level) => [level.id, String(start.limits.find((limit) => limit.levelId === level.id)?.amount ?? '')])),
  );
  const [detail, setDetail] = useState(start.detail);
  const [maxClaims, setMaxClaims] = useState(start.maxClaims ? String(start.maxClaims) : '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'submit' | 'withdraw' | null>(null);

  async function send(action: 'submit' | 'withdraw') {
    if (busy) return;
    const limits = levels.map((level) => ({ levelId: level.id, amount: toNumber(amounts[level.id] ?? '') })).filter((limit) => !Number.isNaN(limit.amount));
    if (action === 'submit') {
      if (!limits.some((limit) => limit.amount > 0)) return setError('กรอกวงเงินอย่างน้อย 1 ระดับ');
      if (!message.trim()) return setError('เขียนข้อความถึงหัวหน้า HR ว่าแก้อะไรไป');
    }
    setBusy(action);
    setError('');
    try {
      const response = await fetch(`/api/hr/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'withdraw'
            ? { action: 'withdraw', message }
            : { action: 'revise', submit: true, message, input: { ...start, detail, limits, maxClaims: maxClaims.trim() ? Number(maxClaims) : null } },
        ),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      notify(action === 'withdraw' ? 'ถอนข้อเสนอแล้ว' : 'ส่งกลับให้หัวหน้า HR แล้ว');
      router.push('/hr/benefits');
      router.refresh();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {request ? (
        <section aria-label="ความเห็นของหัวหน้า HR" className="flex flex-col gap-2 rounded-[8px] border border-[#FDBA74] bg-[#FFF7ED] px-[18px] py-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={request.by} size="sm" tone="orange" />
            <span className="text-13">
              <b className="font-semibold">{request.by}</b> · หัวหน้า HR · {thaiDate(request.at)}
            </span>
          </div>
          <p className="text-[#431407]">&ldquo;{request.note}&rdquo;</p>
        </section>
      ) : null}

      <Card className="flex flex-col gap-3.5 p-5">
        <p className="text-12 text-muted">ช่องสีเทาแก้ไขไม่ได้ ช่องกรอบสีส้มคือจุดที่หัวหน้า HR ขอให้แก้</p>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <ReadOnlyInput label="ชื่อสวัสดิการ" value={start.name} />
          <ReadOnlyInput label="หมวด" value={start.category} />
        </div>
        <div>
          <p className={cx(labelClass, '!text-[#9A3412]')}>วงเงินตามระดับ (บาท) · ต้องแก้</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {levels.map((level) => (
              <div key={level.id}>
                <label htmlFor={`revise-${level.id}`} className={labelClass}>
                  {level.code}
                </label>
                <input
                  id={`revise-${level.id}`}
                  inputMode="decimal"
                  value={amounts[level.id] ?? ''}
                  onChange={(event) => setAmounts({ ...amounts, [level.id]: event.target.value })}
                  className={cx(fieldClass, fixClass, 'text-right')}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="revise-detail" className={cx(labelClass, '!text-[#9A3412]')}>
            รายละเอียดเต็ม · ต้องแก้
          </label>
          <textarea id="revise-detail" rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} className={cx(fieldClass, fixClass, 'h-auto py-2.5')} />
        </div>
        <Input label="จำนวนครั้งต่อปี" inputMode="numeric" value={maxClaims} onChange={(event) => setMaxClaims(event.target.value)} hint="เว้นว่าง = ไม่จำกัด" className="sm:max-w-[240px]" />
        <Input label="ข้อความถึงหัวหน้า HR" value={message} onChange={(event) => setMessage(event.target.value)} />
        {error ? (
          <p role="alert" className="text-13 text-[#991B1B]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void send('submit')} disabled={busy !== null}>
            {busy === 'submit' ? 'กำลังส่ง...' : 'ส่งกลับให้หัวหน้า HR'}
          </Button>
          <Button variant="reject" onClick={() => void send('withdraw')} disabled={busy !== null}>
            {busy === 'withdraw' ? 'กำลังถอน...' : 'ถอนข้อเสนอ'}
          </Button>
        </div>
      </Card>
    </>
  );
}
