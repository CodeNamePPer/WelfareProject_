'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, type Role } from '@/lib/auth/roles';
import { formatBahtWhole, formatThaiDate } from '@/lib/format';
import { Badge, BenefitPreview, Button, ButtonLink, Card, PageHeader, Textarea } from '@/features/hr/ui';
import { useToast } from '@/components/ui/Toast';
import type { BudgetType, WelfareItem } from '@/types';

const BUDGET_DB: Record<BudgetType, 'yearly' | 'monthly' | 'per_claim'> = {
  รายปี: 'yearly',
  รายเดือน: 'monthly',
  ต่อครั้ง: 'per_claim',
};

export function BenefitDetailView({
  benefit,
  backHref,
  editHref,
  onEdit,
  openProposalNo = null,
  onProposedClose,
}: {
  benefit: WelfareItem;
  backHref: string;
  editHref?: string;
  onEdit?: () => void;
  openProposalNo?: string | null;
  onProposedClose?: () => void;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [closingOpen, setClosingOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeError, setCloseError] = useState('');
  const [closing, setClosing] = useState(false);

  const chips = [
    benefit.allowFamily ? 'เบิกให้ครอบครัวได้' : null,
    benefit.allowInsurance ? 'เบิกส่วนเกินประกันได้' : null,
    benefit.allowAdvance ? 'เบิกล่วงหน้าได้' : null,
  ].filter((c): c is string => c !== null);

  const previewAmount =
    benefit.levelLimits && benefit.levelLimits.length > 0
      ? (benefit.levelLimits[2]?.amount ?? benefit.levelLimits[benefit.levelLimits.length - 1]?.amount ?? benefit.amount)
      : benefit.amount;

  const submitCloseProposal = async () => {
    if (closing) return;
    if (!closeReason.trim()) {
      setCloseError('กรุณาระบุเหตุผลที่เสนอปิดรับคำขอสวัสดิการนี้');
      return;
    }
    setClosing(true);
    setCloseError('');
    try {
      const response = await fetch('/api/hr/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'close',
          benefitCode: benefit.code,
          submit: true,
          input: {
            name: benefit.name,
            category: benefit.category ?? '',
            description: benefit.description ?? '',
            detail: benefit.detail ?? '',
            imagePath: benefit.imagePath ?? null,
            budgetType: BUDGET_DB[benefit.budgetType],
            limits: [{ levelId: null, amount: benefit.amount }],
            maxClaims: benefit.maxClaimsPerYear,
            effectiveFrom: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }),
            allowFamily: Boolean(benefit.allowFamily),
            allowInsurance: Boolean(benefit.allowInsurance),
            allowAdvance: Boolean(benefit.allowAdvance),
            documents: benefit.documents,
            reason: closeReason.trim(),
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCloseError(data.error ?? 'ส่งข้อเสนอปิดสวัสดิการไม่สำเร็จ');
        return;
      }
      notify(`ส่งข้อเสนอปิดสวัสดิการ ${data.proposalNo ?? ''} ให้หัวหน้า HR พิจารณาแล้ว`);
      setClosingOpen(false);
      setCloseReason('');
      if (onProposedClose) {
        onProposedClose();
      } else {
        router.push(backHref);
        router.refresh();
      }
    } catch {
      setCloseError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setClosing(false);
    }
  };

  const facts: [string, string][] = [
    ['หมวดสวัสดิการ', benefit.category || '—'],
    ['รอบวงเงิน', benefit.budgetType],
    [
      'วงเงินพื้นฐาน',
      `${formatBahtWhole(benefit.amount)} ${benefit.budgetType}${
        benefit.nextLimit ? ` (เปลี่ยนเป็น ${formatBahtWhole(benefit.nextLimit.amount)} ตั้งแต่ ${formatThaiDate(benefit.nextLimit.from)})` : ''
      }`,
    ],
    ['จำนวนครั้งที่เบิกได้', benefit.maxClaims || 'ไม่จำกัด'],
    ['ผู้มีสิทธิ์', benefit.eligible || 'พนักงานทุกคน'],
    ['วันที่เริ่มใช้วงเงิน', benefit.startDate ? formatThaiDate(benefit.startDate) : '—'],
    ['ผู้อนุมัติการเบิก', ROLE_LABELS[benefit.approver as Role] ?? (benefit.approver || '—')],
    ['งบรวมโดยประมาณ', benefit.estimatedBudget || '—'],
    ['แก้ไขล่าสุด', benefit.updatedAt ? formatThaiDate(benefit.updatedAt) : '—'],
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'จัดการสวัสดิการ', href: backHref }, { label: benefit.code }]}
        title={benefit.name}
        description={[benefit.code, benefit.category].filter(Boolean).join(' · ')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {openProposalNo ? <Badge tone="review">รออนุมัติ ({openProposalNo})</Badge> : null}
            {benefit.status === 'active' ? <Badge tone="approved">เปิดใช้</Badge> : <Badge tone="neutral">ปิดรับคำขอ</Badge>}
            {editHref && !openProposalNo ? (
              <ButtonLink href={editHref}>เสนอแก้ไขสวัสดิการ</ButtonLink>
            ) : onEdit ? (
              <Button onClick={onEdit} disabled={Boolean(openProposalNo)}>
                {openProposalNo ? 'มีข้อเสนอรออนุมัติ' : 'เสนอแก้ไขสวัสดิการ'}
              </Button>
            ) : null}
            {benefit.status === 'active' && !openProposalNo ? (
              <Button variant="reject" onClick={() => setClosingOpen((prev) => !prev)}>
                เสนอปิดรับคำขอ
              </Button>
            ) : null}
          </div>
        }
      />

      {closingOpen ? (
        <Card className="flex flex-col gap-3 border-[#FCA5A5] bg-[#FEF2F2] p-5">
          <h2 className="text-15 font-semibold text-[#991B1B]">เสนอปิดรับคำขอสวัสดิการ {benefit.name} ({benefit.code})</h2>
          <p className="text-13 text-ink-soft">การปิดใช้สวัสดิการจะส่งเป็นข้อเสนอให้หัวหน้า HR พิจารณาอนุมัติก่อนมีผล</p>
          <Textarea
            label={<>เหตุผลที่เสนอปิดใช้ <span className="text-[#B3261E]">*</span></>}
            rows={2}
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
            error={closeError}
            placeholder="เช่น รวมเข้ากับสวัสดิการอื่น หรือสิ้นสุดโครงการประจำปี"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="reject" onClick={() => void submitCloseProposal()} disabled={closing}>
              {closing ? 'กำลังส่งข้อเสนอ...' : 'ส่งข้อเสนอปิดใช้'}
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setClosingOpen(false);
                setCloseReason('');
                setCloseError('');
              }}
              disabled={closing}
            >
              ยกเลิก
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-16 font-semibold">เงื่อนไขและวงเงินการเบิก</h2>
            {benefit.description ? <p className="text-13 text-ink-soft">{benefit.description}</p> : null}
            <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-12 text-muted">{label}</dt>
                  <dd className="text-14 font-medium break-words text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {benefit.levelLimits && benefit.levelLimits.length > 0 ? (
              <div className="border-t border-line pt-3.5">
                <p className="mb-2 text-12 font-medium text-muted">วงเงินตามระดับตำแหน่ง</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {benefit.levelLimits.map((lvl) => (
                    <div key={lvl.levelId} className="flex items-center justify-between rounded-[8px] border border-line bg-surface px-3 py-2 text-13">
                      <span className="text-muted">
                        {lvl.code} · {lvl.name}
                      </span>
                      <span className="font-semibold text-ink tabular-nums">{formatBahtWhole(lvl.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-line pt-3.5">
              <p className="mb-2 text-12 font-medium text-muted">เงื่อนไขเพิ่มเติม</p>
              {chips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <Badge key={chip} tone="review">
                      {chip}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-13 text-muted">เบิกเฉพาะพนักงานตามใบเสร็จจริง</p>
              )}
            </div>

            {benefit.detail ? (
              <div className="border-t border-line pt-3.5">
                <p className="mb-1 text-12 font-medium text-muted">รายละเอียดเต็ม</p>
                <p className="text-14 whitespace-pre-line text-ink">{benefit.detail}</p>
              </div>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-16 font-semibold">เอกสารที่พนักงานต้องแนบ</h2>
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-14 text-ink">
              <li>ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน</li>
              {benefit.documents
                .filter((doc) => doc !== 'ใบเสร็จรับเงิน')
                .map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
            </ol>
            <p className="text-12 text-muted">ใบเสร็จรับเงินระบบบังคับแนบทุกคำขอ รายการอื่นใช้ประกอบการตรวจคำขอเบิก</p>
          </Card>
        </div>

        <aside aria-label="พรีวิวการ์ดสวัสดิการ" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
          <p className="text-12 font-semibold text-muted">พรีวิว: การ์ดที่พนักงานเห็น</p>
          <BenefitPreview
            imageUrl={null}
            category={benefit.category || 'ทั่วไป'}
            label={`${benefit.code}${benefit.category ? ` · ${benefit.category}` : ''}`}
            name={benefit.name}
            description={benefit.description || `วงเงิน ${formatBahtWhole(benefit.amount)} ${benefit.budgetType}`}
            chips={chips}
            maxClaims={benefit.maxClaimsPerYear}
            amount={previewAmount}
          />
        </aside>
      </div>
    </div>
  );
}
