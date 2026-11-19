'use client';

import { useNavTransition } from '@/lib/useNavTransition';
import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button, Card, EmptyState, PageHeader, RequesterCompact, StatRow, StatTile } from '@/features/hr/ui';
import { FinDialog, FormError, financeAction } from '@/features/finance/ui';
import type { FinPerson } from '@/lib/payroll/finance';

export type RefundRow = {
  claimNo: string;
  person: FinPerson;
  cause: string;
  meta: string;
  amount: number;
  receivedAt: string | null;
  receivedThisYear: boolean;
};

// คอลัมน์ตามดีไซน์ F09
const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,2fr)_100px_130px_120px]';

export function RefundsClient({ rows }: { rows: RefundRow[] }) {
  const nav = useNavTransition();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState<RefundRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = rows.filter((row) => !row.receivedAt);
  const done = rows.filter((row) => row.receivedThisYear);
  const sum = (list: RefundRow[]) => list.reduce((total, row) => total + row.amount, 0);

  const confirm = async () => {
    if (!confirming) return;
    setBusy(true);
    const { error: failure } = await financeAction({ type: 'refund_received', claimNo: confirming.claimNo });
    setBusy(false);
    if (failure) return setError(failure);
    notify(`บันทึกรับคืน ${confirming.claimNo} แล้ว`);
    setConfirming(null);
    nav.refresh();
  };

  return (
    <>
      <PageHeader title="เงินที่ต้องคืน" description="เงินเบิกล่วงหน้าที่พนักงานต้องคืนบริษัท" />

      <StatRow>
        <StatTile label="รอคืน" value={String(open.length)} note={baht(sum(open))} tone="warn" />
        <StatTile label="คืนแล้วปีนี้" value={String(done.length)} note={baht(sum(done))} />
      </StatRow>

      <Card>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span>พนักงาน</span>
              <span>สาเหตุ</span>
              <span className="text-right">ยอดคืน</span>
              <span>สถานะ</span>
              <span />
            </div>
            {rows.length === 0 ? (
              <EmptyState>ไม่มีเงินที่พนักงานต้องคืน</EmptyState>
            ) : (
              rows.map((row) => (
                <div key={row.claimNo} className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3', COLS)}>
                  <RequesterCompact person={row.person} />
                  <span className="min-w-0">
                    <span className="block text-13 font-medium">{row.cause}</span>
                    <span className="block text-12 text-muted">{row.meta}</span>
                  </span>
                  <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                  <span>{row.receivedAt ? <Badge tone="paid">คืนแล้ว {row.receivedAt}</Badge> : <Badge tone="review">รอคืนเงิน</Badge>}</span>
                  <span>
                    {row.receivedAt ? null : (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirming(row);
                        }}
                        className="text-13 text-[#1D4ED8] hover:underline"
                      >
                        บันทึกรับคืน
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <p className="text-12 text-muted">รายการที่ยกเลิกเพราะเกินกำหนด: ไม่คืนวงเงินและจำนวนครั้งให้พนักงาน เหลือเพียงรับเงินคืน</p>

      <FinDialog open={confirming !== null} title={confirming ? `บันทึกรับคืน ${confirming.claimNo}` : ''} onClose={() => setConfirming(null)}>
        {confirming ? (
          <>
            <p className="text-14 text-ink-soft">
              ยืนยันว่าได้รับเงินคืนจาก {confirming.person.name} <b className="font-semibold text-ink">{baht(confirming.amount)}</b> แล้ว ระบบบันทึกวันที่รับคืนเป็นวันนี้
            </p>
            <FormError>{error}</FormError>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setConfirming(null)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button onClick={confirm} disabled={busy}>
                {busy ? 'กำลังบันทึก…' : 'ยืนยันรับคืน'}
              </Button>
            </div>
          </>
        ) : null}
      </FinDialog>
    </>
  );
}
