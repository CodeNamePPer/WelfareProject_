'use client';

import Link from 'next/link';
import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { Badge, Card, EmptyState, PageHeader, RequesterCompact, StatRow, StatTile, Tabs, type BadgeTone } from '@/features/hr/ui';
import type { FinPerson } from '@/lib/payroll/finance';

export type AdvanceTab = 'awaiting' | 'review' | 'settle' | 'closed';

export type AdvanceRow = {
  claimNo: string;
  tab: AdvanceTab;
  person: FinPerson;
  benefitName: string;
  meta: string;
  amount: number;
  paidAt: string;
  due: { text: string; tone: BadgeTone };
  dueSoon: boolean;
  overdue: boolean;
  closedThisYear: boolean;
};

const TABS: { id: AdvanceTab; label: string }[] = [
  { id: 'awaiting', label: 'ค้างใบเสร็จ' },
  { id: 'review', label: 'รอ HR ตรวจใบเสร็จ' },
  { id: 'settle', label: 'รอจ่ายส่วนเพิ่ม / รอคืนเงิน' },
  { id: 'closed', label: 'ปิดแล้ว' },
];
const LAST_COLUMN: Record<AdvanceTab, string> = { awaiting: 'ครบกำหนดใบเสร็จ', review: 'ใบเสร็จ', settle: 'สรุปยอด', closed: 'ผล' };

// คอลัมน์ตามดีไซน์ F03
const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_110px_120px_150px]';

export function AdvancesClient({ rows }: { rows: AdvanceRow[] }) {
  const [tab, setTab] = useState<AdvanceTab>('awaiting');
  const awaiting = rows.filter((row) => row.tab === 'awaiting');
  const visible = rows.filter((row) => row.tab === tab);

  return (
    <>
      <PageHeader title="เบิกล่วงหน้า / ค้างใบเสร็จ" description="ติดตามเงินที่จ่ายล่วงหน้าจนกว่าจะแนบใบเสร็จและปิดรายการ" />

      <StatRow>
        <StatTile label="ค้างใบเสร็จ" value={`${awaiting.length} รายการ`} note={baht(awaiting.reduce((sum, row) => sum + row.amount, 0))} tone="warn" />
        <StatTile label="ใกล้ครบกำหนด 7 วัน" value={String(rows.filter((row) => row.dueSoon).length)} note="" />
        <StatTile label="เกินกำหนด" value={String(rows.filter((row) => row.overdue).length)} note="ระบบยกเลิกรายการอัตโนมัติ" />
        <StatTile label="ปิดรายการแล้วปีนี้" value={String(rows.filter((row) => row.closedThisYear).length)} note="" />
      </StatRow>

      <Card>
        <Tabs label="สถานะเบิกล่วงหน้า" panelId="fin-advances" value={tab} onChange={setTab} items={TABS.map((item) => ({ ...item, count: rows.filter((row) => row.tab === item.id).length }))} />
        <div id="fin-advances" role="tabpanel" className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
              <span>ผู้ขอ</span>
              <span>คำขอ</span>
              <span className="text-right">จ่ายล่วงหน้า</span>
              <span>จ่ายเมื่อ</span>
              <span>{LAST_COLUMN[tab]}</span>
            </div>
            {visible.length === 0 ? (
              <EmptyState>ไม่มีรายการในแท็บนี้</EmptyState>
            ) : (
              visible.map((row) => (
                <Link
                  key={row.claimNo}
                  href={`/payroll/approvals/${encodeURIComponent(row.claimNo)}`}
                  className={cx('grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3.5 text-ink no-underline transition-colors hover:bg-surface motion-reduce:transition-none', COLS)}
                >
                  <RequesterCompact person={row.person} />
                  <span className="min-w-0">
                    <span className="block font-medium">{row.benefitName}</span>
                    <span className="block text-12 text-muted">{row.meta}</span>
                  </span>
                  <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                  <span className="text-13">{row.paidAt}</span>
                  <span>
                    <Badge tone={row.due.tone}>{row.due.text}</Badge>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card className="px-5 py-[18px] text-13 text-ink-soft">
        <h2 className="mb-2 text-16 font-semibold text-ink">กติกาปิดรายการ</h2>
        <ul className="flex list-disc flex-col gap-1 pl-[18px]">
          <li>ใบเสร็จน้อยกว่ายอดจ่ายล่วงหน้า: บันทึกยอดคืน หักเงินเดือนรอบถัดไป และคืนวงเงินให้พนักงาน</li>
          <li>ใบเสร็จมากกว่ายอดจ่ายล่วงหน้า: จ่ายเพิ่มได้ไม่เกินวงเงินคงเหลือของสิทธิ์นั้น</li>
          <li>
            เกินกำหนดแนบใบเสร็จ: ระบบยกเลิกรายการอัตโนมัติ คืนวงเงินและจำนวนครั้ง แล้วติดตามเงินคืนที่{' '}
            <Link href="/payroll/refunds" className="text-[#1D4ED8] hover:underline">
              เงินที่ต้องคืน
            </Link>
          </li>
        </ul>
      </Card>
    </>
  );
}
