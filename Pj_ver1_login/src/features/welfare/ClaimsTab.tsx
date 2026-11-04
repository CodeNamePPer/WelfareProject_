'use client';

import { useState, type ReactNode } from 'react';
import { FileDown, Paperclip } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ExportCsvDialog } from '../../components/ui/ExportCsvDialog';
import { FilterChips } from '../../components/ui/FilterChips';
import { StatusBadge, statusLabel } from '../../components/ui/StatusBadge';
import { revealDetail, table } from '../../components/ui/table';
import { downloadCsv } from '../../lib/csv';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { Claim, ClaimEvent, ClaimEventKind, ClaimStatus, Employee } from '../../types';

const CSV_COLUMNS = [
  'เลขที่คำขอ',
  'วันที่ยื่น',
  'วันที่เกิดค่าใช้จ่าย',
  'รหัสพนักงาน',
  'ผู้เบิก',
  'แผนก',
  'สวัสดิการ',
  'ยอดขอเบิก',
  'ยอดอนุมัติ',
  'สถานะ',
  'ขั้นตอน',
  'ผู้ดำเนินการล่าสุด',
  'วันที่ดำเนินการล่าสุด',
  'เหตุผลปฏิเสธ',
];
const STATUS_FILTERS: ClaimStatus[] = ['approved', 'pending', 'rejected'];
const DETAIL_ID = 'claim-detail';

type Filter = 'all' | ClaimStatus;

const EVENT_LABEL: Record<ClaimEventKind, string> = {
  submitted: 'ยื่นคำขอ',
  'hr-approved': 'HR ตรวจสอบผ่าน',
  'finance-approved': 'การเงินอนุมัติ',
  rejected: 'ปฏิเสธคำขอ',
  paid: 'จ่ายเงินแล้ว',
};

const has = (claim: Claim, kind: ClaimEventKind) => claim.timeline.some((event) => event.kind === kind);

/** ขั้นตอนปัจจุบัน – คำนวณจาก timeline เพื่อไม่ให้ขัดกับประวัติ */
function stageOf(claim: Claim): string {
  if (claim.status === 'rejected') return has(claim, 'hr-approved') ? 'ไม่ผ่านขั้นการเงิน' : 'ไม่ผ่านขั้น HR';
  if (claim.status === 'pending') return has(claim, 'hr-approved') ? 'รอการเงินอนุมัติ' : 'รอ HR ตรวจสอบ';
  return has(claim, 'paid') ? 'จ่ายเงินแล้ว' : 'อนุมัติแล้ว · รอจ่ายเงิน';
}

/** ขั้นถัดไปที่ยังไม่เกิด – null เมื่อคำขอจบแล้ว */
function nextStepOf(claim: Claim): string | null {
  if (claim.status === 'pending') return has(claim, 'hr-approved') ? 'รอการเงินอนุมัติ' : 'รอ HR ตรวจสอบ';
  if (claim.status === 'approved' && !has(claim, 'paid')) return 'รอจ่ายเงินรอบถัดไป';
  return null;
}

function lastAction(claim: Claim): ClaimEvent | null {
  const actions = claim.timeline.filter((event) => event.kind !== 'submitted');
  return actions[actions.length - 1] ?? null;
}

const rejectionOf = (claim: Claim) => claim.timeline.find((event) => event.kind === 'rejected') ?? null;

const isPartial = (claim: Claim) => claim.approvedAmount !== null && claim.approvedAmount < claim.amount;

const thaiYear = (iso: string) => Number(iso.slice(0, 4)) + 543;

// Admin sees claims read-only: approval belongs to HR / Finance.
export function ClaimsTab({ claims, employees }: { claims: Claim[]; employees: Employee[] }) {
  const employeeOf = new Map(employees.map((employee) => [employee.id, employee]));
  const nameOf = (id: string) => employeeOf.get(id)?.name ?? id;
  const departmentOf = (id: string) => employeeOf.get(id)?.department ?? null;

  const sorted = [...claims].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = filter === 'all' ? sorted : sorted.filter((claim) => claim.status === filter);
  const selected = visible.find((claim) => claim.id === selectedId) ?? null;

  const pick = (id: string) => {
    setSelectedId(id);
    revealDetail(DETAIL_ID);
  };

  const exportCsv = () =>
    downloadCsv(
      `welfare-claims-${new Date().toISOString().slice(0, 10)}.csv`,
      CSV_COLUMNS,
      visible.map((claim) => {
        const last = lastAction(claim);
        return [
          claim.code,
          claim.date,
          claim.expenseDate,
          claim.employeeId,
          nameOf(claim.employeeId),
          departmentOf(claim.employeeId) ?? '',
          claim.benefit,
          claim.amount,
          claim.approvedAmount ?? '',
          statusLabel(claim.status),
          stageOf(claim),
          last?.by ?? '',
          last?.at ?? '',
          rejectionOf(claim)?.note ?? '',
        ];
      }),
    );

  return (
    <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="claims-title" className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]">
        <header className="flex flex-col gap-[12px] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="claims-title" className="text-17 font-semibold text-ink">
              คำขอเบิกล่าสุด
            </h2>
            <p className="mt-[4px] text-12 text-muted">ดูได้อย่างเดียว · การอนุมัติทำโดย HR และฝ่ายการเงิน</p>
          </div>
          <Button onClick={() => setExporting(true)} disabled={visible.length === 0} className="sm:w-[180px] disabled:opacity-50">
            <FileDown className="size-4" aria-hidden="true" />
            ส่งออก CSV
          </Button>
          <ExportCsvDialog
            open={exporting}
            rowCount={visible.length}
            unit="รายการ"
            columns={CSV_COLUMNS}
            personalData="ชื่อพนักงาน แผนก ยอดเงิน และประเภทสวัสดิการที่อาจบ่งบอกข้อมูลสุขภาพ"
            onCancel={() => setExporting(false)}
            onConfirm={() => {
              exportCsv();
              setExporting(false);
            }}
          />
        </header>
        <FilterChips
          label="กรองตามสถานะ"
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: claims.length },
            ...STATUS_FILTERS.map((status) => ({
              id: status,
              label: statusLabel(status),
              count: claims.filter((claim) => claim.status === status).length,
            })),
          ]}
        />
        {visible.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-line px-[16px] py-[24px] text-center text-13 text-muted">
            ไม่มีคำขอเบิกในสถานะนี้
          </p>
        ) : (
          <>
            <div className={table.wrapper}>
              {/* 7 คอลัมน์ – กว้างกว่าตารางมาตรฐาน จึงสลับ min-width (cx ไม่ merge class ซ้ำ) */}
              <table className={table.table.replace('min-w-[640px]', 'min-w-[860px]')}>
                <thead>
                  <tr>
                    <th scope="col" className={table.th}>เลขที่คำขอ</th>
                    <th scope="col" className={table.th}>วันที่ยื่น</th>
                    <th scope="col" className={table.th}>ผู้เบิก</th>
                    <th scope="col" className={table.th}>สวัสดิการ</th>
                    <th scope="col" className={cx(table.th, 'text-right')}>ยอดขอ / อนุมัติ</th>
                    <th scope="col" className={table.th}>สถานะ</th>
                    <th scope="col" className={table.th}>ผู้ดำเนินการล่าสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((claim) => {
                    const isSelected = claim.id === selected?.id;
                    const last = lastAction(claim);
                    const department = departmentOf(claim.employeeId);
                    return (
                      <tr
                        key={claim.id}
                        onClick={() => pick(claim.id)}
                        aria-selected={isSelected}
                        className={cx(table.row, 'cursor-pointer', isSelected ? table.rowSelected : table.rowHover)}
                      >
                        <td className={cx(table.td, 'font-semibold whitespace-nowrap tabular-nums')}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              pick(claim.id);
                            }}
                            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {claim.code}
                          </button>
                        </td>
                        <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>{formatShortThaiDate(claim.date)}</td>
                        <td className={table.td}>
                          {nameOf(claim.employeeId)}
                          <span className="block text-12 text-muted">
                            {claim.employeeId}
                            {department ? ` · ${department}` : ''}
                          </span>
                        </td>
                        <td className={table.td}>{claim.benefit}</td>
                        <td className={cx(table.td, 'whitespace-nowrap text-right tabular-nums')}>
                          <span className="font-medium">{formatBahtWhole(claim.amount)}</span>
                          <AmountNote claim={claim} />
                        </td>
                        <td className={table.td}>
                          <StatusBadge status={claim.status} />
                          <span className="mt-[4px] block text-12 whitespace-nowrap text-muted">{stageOf(claim)}</span>
                        </td>
                        <td className={table.td}>
                          {last ? (
                            <>
                              <span className="whitespace-nowrap">{last.by}</span>
                              <span className="block text-12 text-muted tabular-nums">{formatShortThaiDate(last.at)}</span>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className={table.cards}>
              {visible.map((claim) => {
                const isSelected = claim.id === selected?.id;
                return (
                  <li key={claim.id}>
                    <button
                      type="button"
                      onClick={() => pick(claim.id)}
                      aria-pressed={isSelected}
                      className={cx(table.card, table.cardButton, isSelected ? table.cardSelected : table.cardHover)}
                    >
                      <span className="flex items-start justify-between gap-[8px]">
                        <span className="min-w-0">
                          <span className="block font-semibold">{claim.benefit}</span>
                          <span className="block text-12 text-muted">
                            {nameOf(claim.employeeId)} · {claim.code}
                          </span>
                        </span>
                        <StatusBadge status={claim.status} />
                      </span>
                      <span className="mt-[8px] flex items-end justify-between gap-[8px]">
                        <span className="tabular-nums">
                          <span className="font-semibold">{formatBahtWhole(claim.amount)}</span>
                          <AmountNote claim={claim} />
                        </span>
                        <span className="text-right text-11 text-muted">
                          <span className="block">{stageOf(claim)}</span>
                          <span className="tabular-nums">ยื่น {formatShortThaiDate(claim.date)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {selected ? (
        <ClaimPanel
          key={selected.id}
          claim={selected}
          employeeName={nameOf(selected.employeeId)}
          department={departmentOf(selected.employeeId)}
          usedThisYear={claims
            .filter(
              (other) =>
                other.status === 'approved' &&
                other.employeeId === selected.employeeId &&
                other.benefit === selected.benefit &&
                other.date.slice(0, 4) === selected.date.slice(0, 4),
            )
            .reduce((sum, other) => sum + (other.approvedAmount ?? 0), 0)}
        />
      ) : (
        <p
          id={DETAIL_ID}
          className="rounded-[10px] border border-dashed border-line bg-white p-[20px] text-center text-14 text-muted xl:self-start"
        >
          เลือกคำขอจากตารางเพื่อดูรายละเอียดและประวัติการอนุมัติ
        </p>
      )}
    </div>
  );
}

/** บรรทัดรองใต้ยอดขอ: ยอดที่อนุมัติจริง เน้นสีเมื่ออนุมัติไม่เต็มจำนวน */
function AmountNote({ claim }: { claim: Claim }) {
  if (claim.approvedAmount === null) return null;
  return (
    <span className={cx('block text-12', isPartial(claim) ? 'font-medium text-status-pending-ink' : 'text-muted')}>
      อนุมัติ {formatBahtWhole(claim.approvedAmount)}
    </span>
  );
}

type InfoRow = [label: string, value: ReactNode];

function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="flex flex-col gap-[8px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 text-13">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-ink tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[10px] border-t border-line pt-[16px]">
      <h4 className="text-13 font-semibold text-ink">{title}</h4>
      {children}
    </section>
  );
}

function ClaimPanel({
  claim,
  employeeName,
  department,
  usedThisYear,
}: {
  claim: Claim;
  employeeName: string;
  department: string | null;
  usedThisYear: number;
}) {
  const rejection = rejectionOf(claim);
  const nextStep = nextStepOf(claim);
  const remaining = claim.annualLimit === null ? null : Math.max(claim.annualLimit - usedThisYear, 0);
  const overRemaining = claim.status === 'pending' && remaining !== null && claim.amount > remaining;

  const approvedValue: ReactNode =
    claim.approvedAmount !== null ? (
      <>
        {formatBahtWhole(claim.approvedAmount)}
        {isPartial(claim) ? (
          <span className="block text-12 font-normal text-status-pending-ink">
            ลดลง {formatBahtWhole(claim.amount - claim.approvedAmount)}
          </span>
        ) : null}
      </>
    ) : claim.status === 'pending' ? (
      <span className="font-normal text-muted">รอพิจารณา</span>
    ) : (
      <span className="font-normal text-muted">—</span>
    );

  return (
    <aside
      id={DETAIL_ID}
      aria-labelledby="claim-detail-title"
      className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px] xl:self-start"
    >
      <header className="flex flex-col gap-[8px]">
        <div className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <p className="text-12 text-muted tabular-nums">{claim.code}</p>
            <h3 id="claim-detail-title" className="text-17 font-semibold text-ink">
              {claim.benefit}
            </h3>
          </div>
          <StatusBadge status={claim.status} />
        </div>
        <p className="text-13 text-ink">
          {employeeName}
          <span className="block text-12 text-muted">
            {claim.employeeId}
            {department ? ` · ${department}` : ''}
          </span>
        </p>
      </header>

      {rejection ? (
        <div role="note" className="rounded-[8px] bg-status-rejected-soft p-[12px] text-13 text-status-rejected-ink">
          <p className="font-semibold">เหตุผลที่ปฏิเสธ</p>
          <p className="mt-[4px]">{rejection.note}</p>
        </div>
      ) : null}

      <PanelSection title="ยอดเงิน">
        <InfoRows
          rows={[
            ['ยอดขอเบิก', formatBahtWhole(claim.amount)],
            ['ยอดอนุมัติ', approvedValue],
          ]}
        />
      </PanelSection>

      <PanelSection title={`สิทธิ์ปี ${thaiYear(claim.date)}`}>
        {claim.annualLimit === null ? (
          <p className="text-13 text-muted">สวัสดิการนี้ไม่จำกัดวงเงินต่อปี</p>
        ) : (
          <>
            <InfoRows
              rows={[
                ['วงเงินต่อปี', formatBahtWhole(claim.annualLimit)],
                ['ใช้ไปแล้ว', formatBahtWhole(usedThisYear)],
                ['คงเหลือ', formatBahtWhole(remaining ?? 0)],
              ]}
            />
            <div
              className="h-[6px] overflow-hidden rounded-full bg-surface"
              role="img"
              aria-label={`ใช้สิทธิ์ไปแล้ว ${Math.round((usedThisYear / claim.annualLimit) * 100)}%`}
            >
              <div
                className="h-full rounded-full bg-primary-500"
                style={{ width: `${Math.min((usedThisYear / claim.annualLimit) * 100, 100)}%` }}
              />
            </div>
            {overRemaining ? (
              <p className="text-12 font-medium text-status-pending-ink">
                ยอดขอเกินสิทธิ์คงเหลือ {formatBahtWhole(claim.amount - (remaining ?? 0))}
              </p>
            ) : null}
          </>
        )}
      </PanelSection>

      <PanelSection title="รายละเอียดคำขอ">
        <InfoRows
          rows={[
            ['วันที่ยื่น', formatShortThaiDate(claim.date)],
            ['วันที่เกิดค่าใช้จ่าย', formatShortThaiDate(claim.expenseDate)],
            ['ขั้นตอนปัจจุบัน', stageOf(claim)],
            ...(claim.note ? ([['หมายเหตุผู้เบิก', claim.note]] as InfoRow[]) : []),
          ]}
        />
      </PanelSection>

      <PanelSection title={`เอกสารแนบ (${claim.attachments.length})`}>
        <ul className="flex flex-col gap-[6px]">
          {claim.attachments.map((file) => (
            <li key={file} className="flex items-center gap-[8px] text-13 text-ink">
              <Paperclip className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 break-all">{file}</span>
            </li>
          ))}
        </ul>
        <p className="text-12 text-muted">เปิดไฟล์ได้เฉพาะ HR และฝ่ายการเงิน</p>
      </PanelSection>

      <PanelSection title="ประวัติการดำเนินการ">
        <ol className="flex flex-col">
          {claim.timeline.map((event, index) => {
            const isLast = index === claim.timeline.length - 1 && !nextStep;
            return (
              <TimelineItem
                key={`${event.kind}-${index}`}
                tone={event.kind === 'rejected' ? 'danger' : 'done'}
                connector={!isLast}
                title={EVENT_LABEL[event.kind]}
                meta={`${event.by ?? employeeName} · ${formatShortThaiDate(event.at)}`}
                note={event.note}
              />
            );
          })}
          {nextStep ? <TimelineItem tone="next" connector={false} title={nextStep} /> : null}
        </ol>
      </PanelSection>
    </aside>
  );
}

function TimelineItem({
  tone,
  connector,
  title,
  meta,
  note,
}: {
  tone: 'done' | 'danger' | 'next';
  connector: boolean;
  title: string;
  meta?: string;
  note?: string;
}) {
  return (
    <li className="relative flex gap-[10px] pb-[14px] last:pb-0">
      {connector ? <span className="absolute top-[14px] bottom-0 left-[4.5px] w-px bg-line" aria-hidden="true" /> : null}
      <span
        aria-hidden="true"
        className={cx(
          'relative mt-[5px] size-[10px] shrink-0 rounded-full',
          tone === 'done' && 'bg-status-approved',
          tone === 'danger' && 'bg-status-rejected',
          tone === 'next' && 'border-2 border-dashed border-status-pending bg-white',
        )}
      />
      <div className="min-w-0 text-13">
        <p className={cx('font-medium', tone === 'next' ? 'text-muted' : 'text-ink')}>{title}</p>
        {meta ? <p className="text-12 text-muted tabular-nums">{meta}</p> : null}
        {note ? <p className="mt-[2px] text-12 text-ink">{note}</p> : null}
      </div>
    </li>
  );
}
