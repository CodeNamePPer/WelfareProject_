'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { formatBaht, formatBahtWhole, formatThaiDate } from '../../lib/format';
import { EmployeePicker } from './EmployeePicker';
import { PeriodPicker } from './PeriodPicker';
import { PanelTitle, Region } from './ui';
import type { Claim, Employee, Period } from '../../types';

interface EmployeeClaimStatsProps {
  employees: Employee[];
  periods: Period[];
  claims: Claim[];
}

interface Totals {
  all: { amount: number; count: number };
  pending: { amount: number; count: number };
  approved: { amount: number; count: number; reduced: number };
  rejected: { amount: number; count: number };
}

function summarize(list: Claim[]): Totals {
  const totals: Totals = {
    all: { amount: 0, count: 0 },
    pending: { amount: 0, count: 0 },
    approved: { amount: 0, count: 0, reduced: 0 },
    rejected: { amount: 0, count: 0 },
  };
  for (const claim of list) {
    totals.all.amount += claim.amount;
    totals.all.count += 1;
    if (claim.status === 'approved') {
      // ยอด "อนุมัติ" ใช้ยอดที่อนุมัติจริง (อาจน้อยกว่ายอดขอ) – ยอดรวม/รอ/ปฏิเสธยังเป็นยอดขอเบิก
      const approved = claim.approvedAmount ?? claim.amount;
      totals.approved.amount += approved;
      totals.approved.reduced += claim.amount - approved;
      totals.approved.count += 1;
    } else {
      totals[claim.status].amount += claim.amount;
      totals[claim.status].count += 1;
    }
  }
  return totals;
}

interface BenefitUsage {
  benefit: string;
  limit: number | null;
  /** ยอดอนุมัติจริงทั้งปี */
  used: number;
  /** ยอดขอที่ยังรอตรวจสอบทั้งปี */
  pending: number;
}

/** การใช้วงเงินต่อสวัสดิการในปีปฏิทินเดียวกัน (กติกาเดียวกับแผงรายละเอียดคำขอในหน้าสวัสดิการ) */
function usageForYear(claims: Claim[], employeeId: string, year: string): BenefitUsage[] {
  const byBenefit = new Map<string, BenefitUsage>();
  for (const claim of claims) {
    if (claim.employeeId !== employeeId || claim.date.slice(0, 4) !== year || claim.status === 'rejected') continue;
    const row = byBenefit.get(claim.benefit) ?? { benefit: claim.benefit, limit: claim.annualLimit, used: 0, pending: 0 };
    if (claim.status === 'approved') row.used += claim.approvedAmount ?? 0;
    else row.pending += claim.amount;
    byBenefit.set(claim.benefit, row);
  }
  // ใกล้เต็มวงเงินก่อน สวัสดิการไม่จำกัดวงเงินไว้ท้าย
  const ratio = (row: BenefitUsage) => (row.limit ? (row.used + row.pending) / row.limit : -1);
  return [...byBenefit.values()].sort((a, b) => ratio(b) - ratio(a));
}

// Figma 163:1287 – ยอดหนึ่งช่องในแถบยอดรวม (แถบเดียว เส้นแบ่งร่วม ไม่ใช่การ์ดสี่ใบ)
function StatCard({ label, amount, caption }: { label: string; amount: number; caption: string }) {
  const zero = amount === 0;
  return (
    <div className="flex min-w-0 flex-col gap-[6px] bg-white py-[14px] sm:px-[16px] sm:first:pl-0">
      <p className="text-13 text-muted">{label}</p>
      <p className={cx('text-24 font-semibold tabular-nums', zero ? 'text-muted' : 'text-ink')}>{formatBaht(amount)}</p>
      <p className="text-11 text-muted">{caption}</p>
    </div>
  );
}

function UsageRow({ row }: { row: BenefitUsage }) {
  if (row.limit === null) {
    return (
      <li className="flex items-baseline justify-between gap-[12px] py-[10px] first:pt-0 last:pb-0">
        <span className="text-13 font-medium text-ink">{row.benefit}</span>
        <span className="text-12 text-muted">ไม่จำกัดวงเงิน, ใช้ไป {formatBahtWhole(row.used)}</span>
      </li>
    );
  }
  const remaining = Math.max(row.limit - row.used, 0);
  const over = row.used + row.pending - row.limit;
  const pct = (value: number) => `${Math.min((value / row.limit!) * 100, 100)}%`;
  return (
    <li className="flex flex-col gap-[6px] py-[10px] first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-[12px]">
        <span className="min-w-0 truncate text-13 font-medium text-ink">{row.benefit}</span>
        <span className="shrink-0 text-12 text-muted tabular-nums">
          คงเหลือ <span className="font-semibold text-ink">{formatBahtWhole(remaining)}</span> จาก {formatBahtWhole(row.limit)}
        </span>
      </div>
      <div
        className="flex h-[6px] overflow-hidden rounded-full bg-surface"
        role="img"
        aria-label={`อนุมัติแล้ว ${formatBahtWhole(row.used)} รอตรวจสอบ ${formatBahtWhole(row.pending)} จากวงเงิน ${formatBahtWhole(row.limit)}`}
      >
        <div className="h-full bg-primary-500" style={{ width: pct(row.used) }} />
        <div className="h-full bg-primary-500/35" style={{ width: pct(row.pending) }} />
      </div>
      <p className="text-11 text-muted tabular-nums">
        อนุมัติแล้ว {formatBahtWhole(row.used)}
        {row.pending > 0 ? `, รอตรวจสอบ ${formatBahtWhole(row.pending)}` : ''}
      </p>
      {over > 0 && row.pending > 0 ? (
        <p className="text-12 font-medium text-status-pending-ink">
          ถ้าอนุมัติรายการที่รออยู่ทั้งหมด จะเกินวงเงิน {formatBahtWhole(over)}
        </p>
      ) : null}
    </li>
  );
}

/** พนักงานที่ขอเบิกมากที่สุดในช่วงเวลานั้น ใช้เป็นค่าเริ่มต้นแทนคนแรกในรายชื่อ ซึ่งมักไม่มีรายการและทำให้แผงเปิดมาเป็น ฿0 */
function busiestEmployeeId(employees: Employee[], counts: Map<string, number>): string {
  let best = employees[0]?.id ?? '';
  for (const employee of employees) {
    if ((counts.get(employee.id) ?? 0) > (counts.get(best) ?? 0)) best = employee.id;
  }
  return best;
}

function countByEmployee(claims: Claim[], period: Period | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const claim of claims) {
    if (period && (claim.date < period.from || claim.date > period.to)) continue;
    counts.set(claim.employeeId, (counts.get(claim.employeeId) ?? 0) + 1);
  }
  return counts;
}

// Figma 163:1276 – "สถิติการขอเบิกรายบุคคล".
export function EmployeeClaimStats({ employees, periods, claims }: EmployeeClaimStatsProps) {
  // ช่วงเวลาเริ่มต้น = ช่วงล่าสุดที่มีคำขอเบิก (periods เรียงล่าสุดก่อน) ถ้าไม่มีเลยค่อยใช้ช่วงแรก
  const [initialPeriod] = useState(
    () => periods.find((p) => claims.some((c) => c.date >= p.from && c.date <= p.to)) ?? periods[0],
  );
  const [periodId, setPeriodId] = useState(initialPeriod?.id ?? '');
  const [employeeId, setEmployeeId] = useState(() =>
    busiestEmployeeId(employees, countByEmployee(claims, initialPeriod)),
  );

  const employee = employees.find((item) => item.id === employeeId);
  const period = periods.find((item) => item.id === periodId);
  // จำนวนคำขอของพนักงานที่เลือกในแต่ละช่วง – ใช้ทำจุดบนปฏิทินเดือน
  const countForEmployee = (p: Period) =>
    claims.filter((c) => c.employeeId === employeeId && c.date >= p.from && c.date <= p.to).length;
  const claimCounts = useMemo(() => countByEmployee(claims, period), [claims, period]);

  const filtered = useMemo(() => {
    if (!employee || !period) return [];
    return claims
      .filter((claim) => claim.employeeId === employee.id && claim.date >= period.from && claim.date <= period.to)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [claims, employee, period]);

  const totals = useMemo(() => summarize(filtered), [filtered]);

  const year = (period?.to ?? new Date().toISOString()).slice(0, 4);
  const thaiYear = Number(year) + 543;
  const usage = useMemo(
    () => (employee ? usageForYear(claims, employee.id, year) : []),
    [claims, employee, year],
  );

  const isEmpty = filtered.length === 0;
  // "ในเดือน พ.ย. 2569" / "ในปี 2569" อ่านลื่นกว่า "ในช่วง ทั้งปี 2569"
  const periodPhrase = !period
    ? 'ช่วงที่เลือก'
    : period.kind === 'year'
      ? `ปี ${Number(period.from.slice(0, 4)) + 543}`
      : period.kind === 'month'
        ? `เดือน ${period.label}`
        : `ช่วง ${period.label}`;

  return (
    <Region aria-labelledby="claim-stats-title">
      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <PanelTitle id="claim-stats-title">สถิติการขอเบิกรายบุคคล</PanelTitle>
          <p className="truncate text-13 text-muted">
            {employee ? (
              <>
                <span className="tabular-nums">{employee.code}</span>
                {employee.department ? `, ${employee.department}` : ''}
              </>
            ) : (
              'เลือกพนักงานเพื่อดูยอดขอเบิกและวงเงินคงเหลือ'
            )}
          </p>
        </div>
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <EmployeePicker
            employees={employees}
            value={employeeId}
            onChange={setEmployeeId}
            claimCounts={claimCounts}
            className="sm:w-[260px]"
          />
          <PeriodPicker
            periods={periods}
            value={periodId}
            onChange={setPeriodId}
            countFor={countForEmployee}
            className="sm:w-[150px]"
          />
        </div>
      </div>

      {/* ไม่มีรายการ = บรรทัดเดียว แทนการ์ด ฿0.00 สี่ใบ */}
      {isEmpty ? (
        <p className="border-t border-line pt-[16px] text-13 text-muted">
          {employee?.name ?? 'พนักงานที่เลือก'} ยังไม่มีคำขอเบิกใน{periodPhrase} ลองเลือกช่วงเวลาอื่น
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="ยอดขอเบิกทั้งหมด" amount={totals.all.amount} caption={`${totals.all.count} รายการในช่วงนี้`} />
          <StatCard label="รอตรวจสอบ" amount={totals.pending.amount} caption={`${totals.pending.count} รายการ`} />
          <StatCard
            label="อนุมัติแล้ว"
            amount={totals.approved.amount}
            caption={
              totals.approved.reduced > 0
                ? `${totals.approved.count} รายการ, ปรับลด ${formatBahtWhole(totals.approved.reduced)}`
                : `${totals.approved.count} รายการ`
            }
          />
          <StatCard label="ปฏิเสธ" amount={totals.rejected.amount} caption={`${totals.rejected.count} รายการ`} />
        </div>
      )}

      {isEmpty && usage.length === 0 ? null : (
        <div className="grid items-start gap-[20px] lg:grid-cols-2 lg:gap-0">
          <div className="flex flex-col gap-[10px] lg:pr-[24px]">
            <h3 className="text-14 font-semibold text-ink">วงเงินสวัสดิการปี {thaiYear}</h3>
            {usage.length === 0 ? (
              <p className="text-13 text-muted">ยังไม่ได้ใช้สิทธิ์สวัสดิการในปีนี้</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {usage.map((row) => (
                  <UsageRow key={row.benefit} row={row} />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-[10px] lg:border-l lg:border-line lg:pl-[24px]">
            <h3 className="text-14 font-semibold text-ink">
              คำขอในช่วงนี้ <span className="font-normal text-muted tabular-nums">({filtered.length})</span>
            </h3>
            {isEmpty ? (
              <p className="text-13 text-muted">ไม่มีคำขอใน{periodPhrase}</p>
            ) : (
              <ul className="-mr-[4px] flex max-h-[280px] flex-col divide-y divide-line overflow-y-auto pr-[4px]">
                {filtered.map((claim) => {
                  const partial =
                    claim.status === 'approved' && claim.approvedAmount !== null && claim.approvedAmount < claim.amount;
                  return (
                    <li key={claim.id} className="flex items-center justify-between gap-[12px] py-[10px] first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-13 font-medium text-ink">{claim.benefit}</p>
                        <p className="text-12 text-muted tabular-nums">
                          {claim.code}, ยื่น {formatThaiDate(claim.date)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-[4px]">
                        <span className="text-13 font-semibold text-ink tabular-nums">{formatBaht(claim.amount)}</span>
                        {partial ? (
                          <span className="text-11 text-status-pending-ink tabular-nums">
                            อนุมัติ {formatBahtWhole(claim.approvedAmount!)}
                          </span>
                        ) : null}
                        <StatusBadge status={claim.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Region>
  );
}
