'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import { BenefitThumb } from '@/features/requester/ui';
import type { ProposalStatus, ProposalSummary } from '@/lib/hr/proposals';
import { Badge, Button, Card, EmptyState, PageHeader, Tabs, type BadgeTone } from '@/features/hr/ui';

export type BenefitRow = { code: string; name: string; category: string; amount: number; claims: string; active: boolean };

type Tab = 'active' | 'closed' | 'all';

// คอลัมน์ตามดีไซน์ H03
const COLS = 'grid-cols-[64px_minmax(0,2fr)_minmax(0,1fr)_120px_120px_120px]';
const money = (value: number) => `฿${value.toLocaleString('th-TH')}`;

const PROPOSAL_BADGE: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'ร่าง', tone: 'neutral' },
  pending: { label: 'รอหัวหน้า HR', tone: 'review' },
  needs_info: { label: 'หัวหน้า HR ขอข้อมูลเพิ่ม', tone: 'revise' },
  approved: { label: 'อนุมัติแล้ว', tone: 'approved' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'rejected' },
  withdrawn: { label: 'ถอนแล้ว', tone: 'neutral' },
};
const ROLE_LABEL = { HR: 'HR', SUPER_ADMIN: 'Admin' } as const;

export function BenefitsClient({ rows, proposals }: { rows: BenefitRow[]; proposals: ProposalSummary[] | null }) {
  const { notifyPending } = useToast();
  const [tab, setTab] = useState<Tab>('active');
  const active = rows.filter((row) => row.active).length;
  const shown = rows.filter((row) => tab === 'all' || (tab === 'active' ? row.active : !row.active));

  return (
    <>
      <PageHeader
        title="จัดการสวัสดิการ"
        description="ข้อมูลชุดเดียวกับที่พนักงานเห็น · สร้าง แก้ไข หรือปิดสวัสดิการต้องเสนอผ่านหัวหน้า HR ทุกครั้ง"
        // ฟอร์มเสนอ 4 ขั้น (H04) อยู่ในข้อ 6
        actions={<Button onClick={() => notifyPending('เสนอสวัสดิการใหม่')}>เสนอสวัสดิการใหม่</Button>}
      />

      <Card aria-labelledby="my-proposals">
        <div className="flex flex-wrap justify-between gap-2 px-5 pt-3.5 pb-2">
          <h2 id="my-proposals" className="text-16 font-semibold">
            ข้อเสนอของฉัน (สร้าง / แก้ไข / ปิด)
          </h2>
          <span className="text-12 text-muted">ส่งให้หัวหน้า HR อนุมัติ</span>
        </div>
        {proposals === null ? (
          <EmptyState>โหลดข้อเสนอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</EmptyState>
        ) : proposals.length === 0 ? (
          <EmptyState>ยังไม่มีข้อเสนอที่รอหัวหน้า HR</EmptyState>
        ) : (
          proposals.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] px-5 py-3">
              <span className="min-w-0">
                <span className="block font-medium">
                  {item.name}
                  {item.status === 'needs_info' ? ' ›' : ''}
                </span>
                <span className="block text-12 text-muted">
                  {item.proposalNo} · เสนอโดย {item.proposerName} ({ROLE_LABEL[item.proposerRole]})
                </span>
              </span>
              <Badge tone={PROPOSAL_BADGE[item.status].tone}>{PROPOSAL_BADGE[item.status].label}</Badge>
            </div>
          ))
        )}
      </Card>

      <Card>
        <Tabs
          label="สถานะสวัสดิการ"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'active', label: 'เปิดใช้', count: active },
            { id: 'closed', label: 'ปิดรับคำขอ', count: rows.length - active },
            { id: 'all', label: 'ทั้งหมด', count: rows.length },
          ]}
        />
        {shown.length === 0 ? (
          <EmptyState>{tab === 'closed' ? 'ไม่มีสวัสดิการที่ปิดรับคำขอ' : 'ยังไม่มีรายการสวัสดิการ'}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className={cx('grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                <span />
                <span>สวัสดิการ</span>
                <span>หมวด</span>
                <span className="text-right">วงเงิน</span>
                <span>จำนวนครั้ง</span>
                <span>สถานะ</span>
              </div>
              {shown.map((row) => (
                <Link
                  key={row.code}
                  href={`/hr/benefits/${encodeURIComponent(row.code)}`}
                  className={cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3 text-ink no-underline transition-colors hover:bg-surface motion-reduce:transition-none', COLS)}
                >
                  {/* ภาพแทนสวัสดิการชุดเดียวกับหน้าผู้ส่งคำขอ (ยังไม่มีรูปจริงในฐานข้อมูล) */}
                  <BenefitThumb category={row.category} className="h-12 w-16 rounded-[6px]" />
                  <span className="min-w-0">
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-12 text-muted">{row.code}</span>
                  </span>
                  <span className="text-13">{row.category}</span>
                  <span className="text-right tabular-nums">{money(row.amount)}</span>
                  <span className="text-13">{row.claims}</span>
                  <span>{row.active ? <Badge tone="approved">เปิดใช้</Badge> : <Badge tone="neutral">ปิดรับคำขอ</Badge>}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
