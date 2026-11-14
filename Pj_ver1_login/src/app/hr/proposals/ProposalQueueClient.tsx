'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { ProposalStatus, ProposalSummary } from '@/lib/hr/proposals';
import { Avatar, Badge, Card, EmptyState, PageHeader, StatRow, StatTile, Tabs, buttonClass, type BadgeTone } from '@/features/hr/ui';

export type QueueProposal = ProposalSummary & { imageUrl: string | null };

type Tab = 'pending' | 'needs_info' | 'approved' | 'rejected';

// คอลัมน์ตามดีไซน์ HH1
const COLS = 'grid-cols-[90px_minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_130px_120px]';
const BADGE: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'ร่าง', tone: 'neutral' },
  pending: { label: 'รออนุมัติ', tone: 'review' },
  needs_info: { label: 'ขอข้อมูลเพิ่ม', tone: 'revise' },
  approved: { label: 'อนุมัติแล้ว', tone: 'approved' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'rejected' },
  withdrawn: { label: 'ถอนแล้ว', tone: 'neutral' },
};
const ROLE = { HR: 'HR', SUPER_ADMIN: 'Admin' } as const;
const dayMonth = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }) : '—');

export function ProposalQueueClient({ rows, stats }: { rows: QueueProposal[]; stats: { label: string; value: string; note: string; warn?: boolean }[] }) {
  const [tab, setTab] = useState<Tab>('pending');
  const shown = rows.filter((row) => row.status === tab);
  const count = (id: Tab) => rows.filter((row) => row.status === id).length;

  return (
    <>
      <PageHeader title="อนุมัติสวัสดิการใหม่" description="ข้อเสนอจาก HR และ Admin รอหัวหน้า HR ตัดสินใจ อนุมัติแล้วจะเพิ่มเข้าตาราง welfare_benefit ทันที" />
      <StatRow>
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} note={stat.note} tone={stat.warn ? 'warn' : 'default'} />
        ))}
      </StatRow>
      <Card>
        <Tabs
          label="สถานะข้อเสนอ"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'pending', label: 'รออนุมัติ', count: count('pending') },
            { id: 'needs_info', label: 'ขอข้อมูลเพิ่ม', count: count('needs_info') },
            { id: 'approved', label: 'อนุมัติแล้ว', count: count('approved') },
            { id: 'rejected', label: 'ไม่อนุมัติ', count: count('rejected') },
          ]}
        />
        {shown.length === 0 ? (
          <EmptyState>{tab === 'pending' ? 'ไม่มีข้อเสนอที่รออนุมัติ' : 'ไม่มีข้อเสนอในแท็บนี้'}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {shown.map((row) => (
                <Link
                  key={row.id}
                  href={`/hr/proposals/${row.id}`}
                  className={cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3.5 text-ink no-underline first:border-t-0 hover:bg-surface', COLS)}
                >
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage ผ่านลิงก์ชั่วคราว
                    <img src={row.imageUrl} alt={`รูปประกอบ: ${row.name}`} className="h-14 w-[90px] rounded-[6px] object-cover" />
                  ) : (
                    <span role="img" aria-label={`รูปประกอบ: ${row.name}`} className="flex h-14 w-[90px] items-center justify-center rounded-[6px] bg-mist text-muted">
                      <ImageIcon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">{row.name}</span>
                    <span className="block text-12 text-muted">
                      {row.proposalNo} · เสนอ {dayMonth(row.submittedAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Avatar name={row.proposerName} size="sm" />
                    <span className="text-13">
                      {row.proposerName}
                      <span className="block text-12 text-muted">{ROLE[row.proposerRole]}</span>
                    </span>
                  </span>
                  <span className="text-13">{row.limitLabel}</span>
                  <span>
                    <Badge tone={BADGE[row.status].tone}>{BADGE[row.status].label}</Badge>
                  </span>
                  <span className="text-right">{row.status === 'pending' ? <span className={buttonClass('secondary', 'sm')}>ตรวจข้อเสนอ</span> : null}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
