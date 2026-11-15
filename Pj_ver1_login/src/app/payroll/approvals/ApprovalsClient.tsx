'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import type { ClaimDbStatus } from '@/lib/claims/types';
import { useToast } from '@/components/ui/Toast';
import { Badge, Button, Card, EmptyState, FilterPill, PageHeader, RequesterCompact, StatRow, StatTile, Tabs, fieldClass, type StatTone } from '@/features/hr/ui';
import { claimAction } from '@/features/finance/ui';
import type { FinPerson } from '@/lib/payroll/finance';

export type ApprovalRow = {
  claimNo: string;
  status: ClaimDbStatus;
  person: FinPerson;
  benefitName: string;
  meta: string;
  amount: number;
  payDate: string;
  roundKey: string | null;
  paidAt: string | null;
  /** คำขอของผู้ใช้เอง อนุมัติเองไม่ได้ */
  own: boolean;
};

type Tab = 'pending' | 'awaiting' | 'returned' | 'paid';

const TAB_STATUS: Record<Tab, ClaimDbStatus> = { pending: 'pending_finance', awaiting: 'awaiting_payment', returned: 'finance_returned', paid: 'paid' };
const TAB_LABEL: Record<Tab, string> = { pending: 'รอการเงินอนุมัติ', awaiting: 'อนุมัติแล้ว รอจ่าย', returned: 'ส่งกลับ HR', paid: 'จ่ายแล้ว' };
// ป้ายสถานะตามดีไซน์ F01 (ส่งกลับ HR ใช้คำของแท็บ เพราะเป็นมุมของการเงิน)
const PILL: Record<Tab, { tone: 'finance' | 'approved' | 'revise' | 'paid'; label: string }> = {
  pending: { tone: 'finance', label: 'รอการเงินอนุมัติ' },
  awaiting: { tone: 'approved', label: 'อนุมัติแล้ว รอจ่าย' },
  returned: { tone: 'revise', label: 'ส่งกลับ HR' },
  paid: { tone: 'paid', label: 'จ่ายแล้ว' },
};
const tabOfStatus = (status: ClaimDbStatus) => (Object.keys(TAB_STATUS) as Tab[]).find((tab) => TAB_STATUS[tab] === status) ?? 'pending';
const isTab = (value: string | undefined): value is Tab => value === 'pending' || value === 'awaiting' || value === 'returned' || value === 'paid';

// คอลัมน์ตามดีไซน์ F01
const COLS = 'grid-cols-[28px_minmax(0,2fr)_minmax(0,1.5fr)_100px_120px_140px_130px]';

export function ApprovalsClient({
  description,
  stats,
  rows,
  rounds,
  initialTab,
}: {
  description: string;
  stats: { label: string; value: string; note: string; tone?: StatTone }[];
  rows: ApprovalRow[];
  rounds: { key: string; label: string }[];
  initialTab?: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'pending');
  const [query, setQuery] = useState('');
  const [round, setRound] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const changeTab = (next: Tab) => {
    setTab(next);
    setSelected(new Set());
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
  };

  const q = query.trim().toLowerCase();
  const matches = (row: ApprovalRow) => (!q || `${row.person.name} ${row.person.code} ${row.claimNo}`.toLowerCase().includes(q)) && (!round || row.roundKey === round);
  const visible = rows.filter((row) => tabOfStatus(row.status) === tab && matches(row));
  const selectable = visible.filter((row) => row.status === 'pending_finance' && !row.own);
  const chosen = selectable.filter((row) => selected.has(row.claimNo));

  const toggle = (claimNo: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(claimNo)) next.delete(claimNo);
      else next.add(claimNo);
      return next;
    });

  const approve = async (claimNos: string[]) => {
    if (claimNos.length === 0) return;
    setBusy(claimNos.length === 1 ? claimNos[0] : 'bulk');
    let done = 0;
    let failure: string | null = null;
    for (const claimNo of claimNos) {
      const { error } = await claimAction(claimNo, { action: 'finance_approve' });
      if (error) {
        failure = `${claimNo}: ${error}`;
        break;
      }
      done += 1;
    }
    setBusy(null);
    setSelected(new Set());
    notify(failure ? (done > 0 ? `อนุมัติจ่ายแล้ว ${done} รายการ · ${failure}` : failure) : `อนุมัติจ่ายแล้ว ${done} รายการ`);
    router.refresh();
  };

  const count = (t: Tab) => rows.filter((row) => tabOfStatus(row.status) === t).length;

  return (
    <>
      <PageHeader title="รายการอนุมัติ / รอจ่าย" description={description} />

      <StatRow>
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} note={stat.note} tone={stat.tone} />
        ))}
      </StatRow>

      <Card>
        <Tabs label="สถานะคำขอ" panelId="fin-approvals" value={tab} onChange={changeTab} items={(Object.keys(TAB_LABEL) as Tab[]).map((id) => ({ id, label: TAB_LABEL[id], count: count(id) }))} />
        <div id="fin-approvals" role="tabpanel">
          <div className="flex flex-wrap justify-between gap-2 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              <input aria-label="ค้นหา" placeholder="ค้นหาชื่อ เลขคำขอ" value={query} onChange={(event) => setQuery(event.target.value)} className={cx(fieldClass, 'h-9 w-[260px] max-w-full')} />
              <FilterPill label="รอบจ่าย" value={round} onChange={setRound}>
                {rounds.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </FilterPill>
            </div>
            {tab === 'pending' ? (
              <Button className="h-9" disabled={chosen.length === 0 || busy !== null} onClick={() => approve(chosen.map((row) => row.claimNo))}>
                {busy === 'bulk' ? 'กำลังอนุมัติ…' : chosen.length > 0 ? `อนุมัติจ่ายที่เลือก (${chosen.length})` : 'อนุมัติจ่ายที่เลือก'}
              </Button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              <div className={cx('grid gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                <span>
                  {tab === 'pending' && selectable.length > 0 ? (
                    <input
                      type="checkbox"
                      aria-label="เลือกทั้งหมด"
                      className="size-[18px]"
                      checked={chosen.length === selectable.length}
                      onChange={(event) => setSelected(event.target.checked ? new Set(selectable.map((row) => row.claimNo)) : new Set())}
                    />
                  ) : null}
                </span>
                <span>ผู้ขอ</span>
                <span>คำขอ</span>
                <span className="text-right">ยอดจ่าย</span>
                <span>วันจ่าย</span>
                <span>สถานะ</span>
                <span />
              </div>
              {visible.length === 0 ? (
                <EmptyState>{q || round ? 'ไม่พบคำขอที่ตรงกับการค้นหา' : `ไม่มีคำขอ${TAB_LABEL[tab]}`}</EmptyState>
              ) : (
                visible.map((row) => {
                  const href = `/payroll/approvals/${encodeURIComponent(row.claimNo)}`;
                  const pill = PILL[tabOfStatus(row.status)];
                  return (
                    <div
                      key={row.claimNo}
                      onClick={() => router.push(href)}
                      className={cx('grid cursor-pointer items-center gap-3 border-t border-[#F1F5F9] px-5 py-3.5 transition-colors hover:bg-surface motion-reduce:transition-none', COLS)}
                    >
                      <span onClick={(event) => event.stopPropagation()}>
                        {row.status === 'pending_finance' && !row.own ? (
                          <input type="checkbox" aria-label={`เลือก ${row.claimNo}`} className="size-[18px]" checked={selected.has(row.claimNo)} onChange={() => toggle(row.claimNo)} />
                        ) : null}
                      </span>
                      <RequesterCompact person={row.person} />
                      <span className="min-w-0">
                        <Link href={href} onClick={(event) => event.stopPropagation()} className="block font-medium text-ink no-underline hover:underline">
                          {row.benefitName}
                        </Link>
                        <span className="block text-12 text-muted">{row.meta}</span>
                      </span>
                      <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                      <span className="text-13">{row.payDate}</span>
                      <span>
                        <Badge tone={pill.tone}>{pill.label}</Badge>
                      </span>
                      <span className="text-right" onClick={(event) => event.stopPropagation()}>
                        {row.status === 'pending_finance' && row.own ? (
                          <span className="text-12 text-muted">คำขอของคุณ อนุมัติเองไม่ได้</span>
                        ) : row.status === 'pending_finance' ? (
                          <Button size="sm" disabled={busy !== null} onClick={() => approve([row.claimNo])}>
                            {busy === row.claimNo ? 'กำลังอนุมัติ…' : 'อนุมัติจ่าย'}
                          </Button>
                        ) : row.status === 'awaiting_payment' ? (
                          <span className="text-12 text-muted">อยู่ในรอบจ่าย</span>
                        ) : row.status === 'finance_returned' ? (
                          <span className="text-12 text-muted">รอ HR</span>
                        ) : null}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Card>

      <p className="text-12 text-muted">การเงินไม่เห็นเอกสารสุขภาพ และปรับยอดไม่ได้ (HR ปรับ) ถ้าพบปัญหาให้ส่งกลับ HR</p>
    </>
  );
}
