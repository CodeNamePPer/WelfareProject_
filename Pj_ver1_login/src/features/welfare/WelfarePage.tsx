'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilterChips } from '../../components/ui/FilterChips';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Tag } from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import type { BudgetType as ProposalBudgetType, ProposalDetail, ProposalKind, ProposalStatus, ProposalSummary } from '../../lib/hr/proposals';
import { useDetailParam } from '../../lib/useDetailParam';
import type { Claim, Employee, WelfareItem } from '../../types';
import { Badge, BenefitPreview, Button, Card, EmptyState, PageHeader, type BadgeTone } from '../hr/ui';
import { ProposalForm } from '../../app/hr/benefits/propose/ProposalForm';
import { PROPOSAL_STATUS, ProposalFacts, thaiDate } from '../../app/hr/proposals/ProposalFacts';
import { ReviseClient } from '../../app/hr/benefits/proposals/[id]/ReviseClient';
import { BenefitDetailView } from './BenefitDetailView';
import { ClaimDetailPage, ClaimsTab } from './ClaimsTab';
import { WelfareCatalog, type OpenItem } from './WelfareCatalog';

export type TabId = 'catalog' | 'proposals' | 'claims';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'catalog', label: 'สวัสดิการที่มีอยู่' },
  { id: 'proposals', label: 'ข้อเสนอสวัสดิการ' },
  { id: 'claims', label: 'คำขอเบิก' },
];

const BUDGET_DB: Record<string, ProposalBudgetType> = {
  รายปี: 'yearly',
  รายเดือน: 'monthly',
  ต่อครั้ง: 'per_claim',
};

const KIND_LABEL: Record<ProposalKind, string> = {
  create: 'สร้างใหม่',
  update: 'แก้ไข',
  close: 'ปิดใช้',
};

const PROPOSAL_BADGE: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'ร่าง', tone: 'neutral' },
  pending: { label: 'รอหัวหน้า HR', tone: 'review' },
  needs_info: { label: 'หัวหน้า HR ขอข้อมูลเพิ่ม', tone: 'revise' },
  approved: { label: 'อนุมัติแล้ว', tone: 'approved' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'rejected' },
  withdrawn: { label: 'ถอนแล้ว', tone: 'neutral' },
};

const STATUS_META: Record<ProposalStatus, { label: string; tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger' }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral' },
  pending: { label: 'รอหัวหน้า HR อนุมัติ', tone: 'warning' },
  needs_info: { label: 'หัวหน้า HR ขอข้อมูลเพิ่ม', tone: 'info' },
  approved: { label: 'อนุมัติแล้ว', tone: 'success' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'danger' },
  withdrawn: { label: 'ถอนข้อเสนอแล้ว', tone: 'neutral' },
};

interface WelfarePageProps {
  initialItems: WelfareItem[];
  initialProposals: ProposalSummary[];
  proposalOptions: {
    categories: string[];
    levels: { id: string; code: string; name: string }[];
  };
  currentUserCode: string;
  claims: Claim[];
  employees: Employee[];
  initialTab?: TabId;
  startCreating?: boolean;
}

export function WelfarePage({
  initialItems,
  initialProposals,
  proposalOptions,
  currentUserCode,
  claims,
  employees,
  initialTab = 'catalog',
  startCreating = false,
}: WelfarePageProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [proposingNew, setProposingNew] = useState(startCreating);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [items, setItems] = useState(initialItems);
  const [proposals, setProposals] = useState(initialProposals);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  useEffect(() => {
    if (startCreating) {
      setProposingNew(true);
      router.replace('/admin/benefits', { scroll: false });
    }
  }, [startCreating, router]);

  // ?claim=เลขที่คำขอ, ?item=รหัสสวัสดิการ, ?proposal=id เปิดหน้ารายละเอียด
  const claimDetail = useDetailParam('claim');
  const openedClaim = claims.find((claim) => claim.code === claimDetail.id);
  const itemDetail = useDetailParam('item');
  const openedItem = items.find((item) => item.code === itemDetail.id);
  const proposalDetailParam = useDetailParam('proposal');
  const openedProposalSummary = proposals.find((p) => p.id === proposalDetailParam.id);

  // แผนที่รหัสสวัสดิการ -> เลขข้อเสนอที่ยังเปิดอยู่
  const openProposalByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of proposals) {
      if (p.benefitCode && (p.status === 'draft' || p.status === 'pending' || p.status === 'needs_info')) {
        map.set(p.benefitCode, p.proposalNo);
      }
    }
    return map;
  }, [proposals]);

  const activeProposals = useMemo(
    () => proposals.filter((p) => p.status === 'draft' || p.status === 'pending' || p.status === 'needs_info'),
    [proposals],
  );

  const openProposalsCount = useMemo(
    () => proposals.filter((p) => p.status === 'pending' || p.status === 'needs_info').length,
    [proposals],
  );

  const openItem: OpenItem = (code, { edit = false, pushUrl = true } = {}) => {
    setEditingCode(edit ? code : null);
    if (pushUrl) itemDetail.open(code, { tab });
  };

  const editingItem = editingCode ? items.find((i) => i.code === editingCode) : null;
  const isDetailOpen = Boolean(openedClaim || openedItem || openedProposalSummary || proposingNew || editingItem);

  return (
    <>
      {openedClaim ? <ClaimDetailPage claim={openedClaim} claims={claims} employees={employees} /> : null}

      {(proposingNew || editingItem) && !openedClaim ? (
        <ProposalForm
          key={editingItem ? `edit-${editingItem.code}` : 'propose-new'}
          mode="propose"
          kind={editingItem ? 'update' : 'create'}
          benefitCode={editingItem?.code}
          levels={proposalOptions.levels}
          categories={proposalOptions.categories}
          headName={null}
          returnHref="/admin/benefits"
          initial={
            editingItem
              ? {
                  input: {
                    name: editingItem.name,
                    category: editingItem.category ?? '',
                    description: editingItem.description ?? '',
                    detail: editingItem.detail ?? '',
                    imagePath: editingItem.imagePath ?? null,
                    budgetType: BUDGET_DB[editingItem.budgetType] ?? 'yearly',
                    limits:
                      editingItem.levelLimits && editingItem.levelLimits.length > 0
                        ? editingItem.levelLimits.map((lvl) => ({ levelId: lvl.levelId, amount: lvl.amount }))
                        : proposalOptions.levels.map((lvl) => ({ levelId: lvl.id, amount: editingItem.amount })),
                    maxClaims: editingItem.maxClaimsPerYear,
                    effectiveFrom:
                      editingItem.startDate && editingItem.startDate >= new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
                        ? editingItem.startDate
                        : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }),
                    allowFamily: Boolean(editingItem.allowFamily),
                    allowInsurance: Boolean(editingItem.allowInsurance),
                    allowAdvance: Boolean(editingItem.allowAdvance),
                    documents: editingItem.documents,
                    reason: '',
                  },
                  imageUrl: null,
                }
              : undefined
          }
          onCancel={() => {
            setProposingNew(false);
            setEditingCode(null);
          }}
          onSuccess={() => {
            setProposingNew(false);
            setEditingCode(null);
            itemDetail.close();
            setTab('proposals');
            router.refresh();
          }}
        />
      ) : null}

      {openedItem && !editingItem && !proposingNew && !openedClaim ? (
        <BenefitDetailView
          benefit={openedItem}
          backHref="/admin/benefits"
          openProposalNo={openProposalByCode.get(openedItem.code) ?? null}
          onEdit={() => setEditingCode(openedItem.code)}
          onProposedClose={() => {
            itemDetail.close();
            setTab('proposals');
            router.refresh();
          }}
        />
      ) : null}

      {openedProposalSummary && !openedClaim && !openedItem && !proposingNew && !editingItem ? (
        <ProposalDetailView
          summary={openedProposalSummary}
          currentUserCode={currentUserCode}
          levels={proposalOptions.levels}
          onClose={() => proposalDetailParam.close()}
          onUpdated={() => {
            proposalDetailParam.close();
            router.refresh();
          }}
        />
      ) : null}

      <div className={cx('flex flex-col gap-4', isDetailOpen && 'hidden')}>
        <PageHeader
          title="จัดการสวัสดิการ"
          description="ข้อมูลชุดเดียวกับที่พนักงานและ HR เห็น · สร้าง แก้ไข หรือปิดสวัสดิการต้องเสนอผ่านหัวหน้า HR ทุกครั้ง"
          actions={
            <Button onClick={() => setProposingNew(true)}>
              เสนอสวัสดิการใหม่
            </Button>
          }
        />

        {/* การ์ดข้อเสนอที่กำลังดำเนินการ (ดีไซน์เดียวกับ HR /hr/benefits) */}
        <Card aria-labelledby="admin-open-proposals">
          <div className="flex flex-wrap justify-between gap-2 px-5 pt-3.5 pb-2">
            <h2 id="admin-open-proposals" className="text-16 font-semibold">
              ข้อเสนอสวัสดิการ (สร้าง / แก้ไข / ปิด)
            </h2>
            <span className="text-12 text-muted">ส่งให้หัวหน้า HR อนุมัติ</span>
          </div>
          {activeProposals.length === 0 ? (
            <EmptyState>ยังไม่มีข้อเสนอที่รอหัวหน้า HR</EmptyState>
          ) : (
            activeProposals.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => proposalDetailParam.open(item.id, { tab: 'proposals' })}
                className="flex w-full items-center justify-between gap-3 border-t border-[#F1F5F9] px-5 py-3 text-left text-ink hover:bg-surface"
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {item.name}
                    {item.status === 'needs_info' ? ' ›' : ''}
                  </span>
                  <span className="block text-12 text-muted">
                    {item.proposalNo} · {KIND_LABEL[item.kind]} · เสนอโดย {item.proposerName} ({item.proposerRole === 'SUPER_ADMIN' ? 'Admin' : 'HR'})
                  </span>
                </span>
                <Badge tone={PROPOSAL_BADGE[item.status].tone}>{PROPOSAL_BADGE[item.status].label}</Badge>
              </button>
            ))
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-[12px] border-b border-line pl-[8px] pr-[16px] sm:pl-[12px] sm:pr-[20px]">
            <div role="tablist" aria-label="หมวดจัดการสวัสดิการ" className="scrollbar-none flex min-w-0 flex-1 gap-[4px] overflow-x-auto">
              {tabs.map(({ id, label }) => {
                const active = id === tab;
                const badgeCount = id === 'proposals' ? openProposalsCount : 0;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={active}
                    aria-controls={`panel-${id}`}
                    onClick={() => setTab(id)}
                    className={cx(
                      '-mb-px inline-flex shrink-0 items-center gap-[6px] border-b-2 px-[12px] py-[12px] text-14 sm:px-[18px] whitespace-nowrap transition-colors motion-reduce:transition-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                      active ? 'border-primary-600 font-semibold text-primary-700' : 'border-transparent text-muted hover:text-ink',
                    )}
                  >
                    <span>{label}</span>
                    {badgeCount > 0 ? (
                      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-warning-bg px-[6px] text-11 font-semibold text-warning-text tabular-nums">
                        {badgeCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <Link
              href="/admin/logs?tab=welfare"
              className="inline-flex shrink-0 items-center gap-[4px] rounded-[4px] text-13 font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              ประวัติการแก้ไข
            </Link>
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col">
            {tab === 'catalog' ? (
              <WelfareCatalog items={items} openProposalByCode={openProposalByCode} onOpen={openItem} />
            ) : null}
            {tab === 'proposals' ? (
              <ProposalsTab
                proposals={proposals}
                currentUserCode={currentUserCode}
                onOpen={(id) => proposalDetailParam.open(id, { tab: 'proposals' })}
              />
            ) : null}
            {tab === 'claims' ? <ClaimsTab claims={claims} employees={employees} onOpen={(code) => claimDetail.open(code, { tab: 'claims' })} /> : null}
          </div>
        </Card>
      </div>
    </>
  );
}

type ProposalFilter = 'all' | 'pending' | 'needs_info' | 'approved' | 'closed';

function ProposalsTab({
  proposals,
  currentUserCode,
  onOpen,
}: {
  proposals: ProposalSummary[];
  currentUserCode: string;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ProposalFilter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const counts = useMemo(
    () => ({
      all: proposals.length,
      pending: proposals.filter((p) => p.status === 'pending').length,
      needs_info: proposals.filter((p) => p.status === 'needs_info').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      closed: proposals.filter((p) => p.status === 'rejected' || p.status === 'withdrawn' || p.status === 'draft').length,
    }),
    [proposals],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proposals.filter((p) => {
      if (filter === 'pending' && p.status !== 'pending') return false;
      if (filter === 'needs_info' && p.status !== 'needs_info') return false;
      if (filter === 'approved' && p.status !== 'approved') return false;
      if (filter === 'closed' && p.status !== 'rejected' && p.status !== 'withdrawn' && p.status !== 'draft') return false;
      return !q || `${p.proposalNo} ${p.name} ${p.benefitCode ?? ''} ${p.proposerName}`.toLowerCase().includes(q);
    });
  }, [proposals, filter, query]);

  const rows = paginate(filtered, page, PAGE_SIZE);

  return (
    <section aria-labelledby="proposals-list-title" className="flex min-w-0 flex-col gap-[16px] p-[16px] sm:p-[20px]">
      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="proposals-list-title" className="text-17 font-semibold text-ink">
            รายการข้อเสนอสวัสดิการทั้งหมด
          </h2>
          <p className="text-12 text-muted">ข้อเสนอสร้าง แก้ไข หรือปิดใช้สวัสดิการจาก Admin และ HR ที่ส่งให้หัวหน้า HR พิจารณา</p>
        </div>
        <SearchInput
          label="ค้นหาข้อเสนอ"
          placeholder="ค้นหาเลขข้อเสนอ / ชื่อสวัสดิการ / ผู้เสนอ"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="sm:w-[300px]"
        />
      </div>

      <FilterChips
        label="กรองสถานะข้อเสนอ"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        options={[
          { id: 'all', label: 'ทั้งหมด', count: counts.all },
          { id: 'pending', label: 'รออนุมัติ', count: counts.pending },
          { id: 'needs_info', label: 'ขอข้อมูลเพิ่ม', count: counts.needs_info },
          { id: 'approved', label: 'อนุมัติแล้ว', count: counts.approved },
          { id: 'closed', label: 'ไม่อนุมัติ / ถอนแล้ว', count: counts.closed },
        ]}
      />

      <div className={table.wrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col" className={table.th}>เลขข้อเสนอ</th>
              <th scope="col" className={table.th}>วันที่เสนอ</th>
              <th scope="col" className={table.th}>ประเภท</th>
              <th scope="col" className={table.th}>สวัสดิการ</th>
              <th scope="col" className={table.th}>ผู้เสนอ</th>
              <th scope="col" className={table.th}>วงเงินที่เสนอ</th>
              <th scope="col" className={table.th}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={cx(table.td, 'py-[40px] text-center text-muted')}>
                  ไม่พบข้อเสนอสวัสดิการที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const statusMeta = STATUS_META[p.status];
                const isMine = p.proposerCode === currentUserCode;
                const dateStr = (p.submittedAt ?? p.createdAt ?? '').slice(0, 10);
                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpen(p.id)}
                    className={cx(table.row, 'cursor-pointer', table.rowHover)}
                  >
                    <td className={cx(table.td, 'font-semibold whitespace-nowrap tabular-nums')}>{p.proposalNo}</td>
                    <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>
                      {dateStr ? formatShortThaiDate(dateStr) : '—'}
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap')}>
                      <Tag tone={p.kind === 'close' ? 'danger' : p.kind === 'update' ? 'info' : 'neutral'}>
                        {KIND_LABEL[p.kind]}
                      </Tag>
                    </td>
                    <td className={table.td}>
                      <span className="font-medium text-ink">{p.name}</span>
                      {p.benefitCode ? <span className="ml-1.5 text-12 text-muted">({p.benefitCode})</span> : null}
                    </td>
                    <td className={cx(table.td, 'text-muted')}>
                      {p.proposerName} ({p.proposerRole === 'SUPER_ADMIN' ? 'Admin' : 'HR'})
                      {isMine ? <span className="ml-1 text-11 font-medium text-primary-700">· ของฉัน</span> : null}
                    </td>
                    <td className={cx(table.td, 'whitespace-nowrap tabular-nums')}>{p.limitLabel}</td>
                    <td className={table.td}>
                      <Tag tone={statusMeta.tone}>{statusMeta.label}</Tag>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-[8px]">
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </div>
    </section>
  );
}

function ProposalDetailView({
  summary,
  currentUserCode,
  levels,
  onClose,
  onUpdated,
}: {
  summary: ProposalSummary;
  currentUserCode: string;
  levels: { id: string; code: string; name: string }[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { notify } = useToast();
  const [detail, setDetail] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/hr/proposals/${encodeURIComponent(summary.id)}`)
      .then((res) => res.json())
      .then((data: { proposal?: ProposalDetail }) => {
        if (active && data.proposal) setDetail(data.proposal);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [summary.id]);

  const isMine = (detail?.proposerCode ?? summary.proposerCode) === currentUserCode;
  const canWithdraw = isMine && (summary.status === 'draft' || summary.status === 'pending' || summary.status === 'needs_info');
  const status = PROPOSAL_STATUS[detail?.status ?? summary.status];

  const handleWithdraw = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/hr/proposals/${encodeURIComponent(summary.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', message: 'ผู้เสนอถอนข้อเสนอ' }),
      });
      if (res.ok) {
        notify(`ถอนข้อเสนอ ${summary.proposalNo} แล้ว`);
        onUpdated();
      }
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-5">
        <p className="text-13 text-muted">กำลังโหลดรายละเอียดข้อเสนอ...</p>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card className="p-5">
        <p className="text-13 text-[#991B1B]">ไม่พบรายละเอียดข้อเสนอ</p>
        <div className="mt-3">
          <Button variant="quiet" onClick={onClose}>
            ย้อนกลับ
          </Button>
        </div>
      </Card>
    );
  }

  const input = detail.input;
  const chips = [
    input.allowFamily ? 'เบิกให้ครอบครัวได้' : null,
    input.allowInsurance ? 'เบิกส่วนเกินประกันได้' : null,
    input.allowAdvance ? 'เบิกล่วงหน้าได้' : null,
  ].filter((c): c is string => c !== null);
  const previewAmount = detail.levelLimits[2]?.amount ?? detail.levelLimits.at(-1)?.amount ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'จัดการสวัสดิการ', href: '/admin/benefits?tab=proposals' }, { label: detail.proposalNo }]}
        title={`ข้อเสนอ ${detail.proposalNo} · ${detail.name}`}
        description={`${KIND_LABEL[detail.kind]} · เสนอโดย ${detail.proposerName} (${detail.proposerRole === 'SUPER_ADMIN' ? 'Admin' : 'HR'}) · ${thaiDate(detail.submittedAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {canWithdraw && detail.status !== 'needs_info' ? (
              <Button variant="reject" onClick={() => void handleWithdraw()} disabled={withdrawing}>
                {withdrawing ? 'กำลังถอน...' : 'ถอนข้อเสนอ'}
              </Button>
            ) : null}
            <Button variant="quiet" onClick={onClose}>
              กลับหน้ารายการ
            </Button>
          </div>
        }
      />

      {detail.status === 'needs_info' && isMine ? (
        <ReviseClient proposal={{ id: detail.id, input: detail.input }} request={detail.infoRequest} levels={levels} onSuccess={onUpdated} />
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            {detail.decisionNote || detail.appliedBenefitCode ? (
              <Card className="p-5 text-13">
                <p className="font-semibold">
                  {detail.status === 'approved' ? `อนุมัติแล้ว · รหัสสวัสดิการ ${detail.appliedBenefitCode ?? ''}` : status.label}
                  {detail.decidedByName ? ` โดย ${detail.decidedByName} · ${thaiDate(detail.decidedAt)}` : ''}
                </p>
                {detail.decisionNote ? <p className="mt-1.5 text-ink-soft">&ldquo;{detail.decisionNote}&rdquo;</p> : null}
              </Card>
            ) : null}
            <ProposalFacts proposal={detail} />
          </div>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
            <p className="text-12 font-semibold text-muted">พรีวิว: การ์ดที่พนักงานเห็น</p>
            <BenefitPreview
              imageUrl={null}
              category={input.category || 'ทั่วไป'}
              label={`${detail.appliedBenefitCode ?? detail.benefitCode ?? 'ใหม่'}${input.category ? ` · ${input.category}` : ''}`}
              name={input.name}
              description={input.description}
              chips={chips}
              maxClaims={input.maxClaims}
              amount={previewAmount}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
