'use client';

import { useMemo, useState } from 'react';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { formatBaht, formatThaiDate } from '../../lib/format';
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
  approved: { amount: number; count: number };
  rejected: { amount: number; count: number };
}

function summarize(list: Claim[]): Totals {
  const empty = () => ({ amount: 0, count: 0 });
  const totals: Totals = { all: empty(), pending: empty(), approved: empty(), rejected: empty() };
  for (const claim of list) {
    totals.all.amount += claim.amount;
    totals.all.count += 1;
    // ยอด "อนุมัติ" ใช้ยอดที่อนุมัติจริง (อาจน้อยกว่ายอดขอ) – ยอดรวม/รอ/ปฏิเสธยังเป็นยอดขอเบิก
    totals[claim.status].amount += claim.status === 'approved' ? (claim.approvedAmount ?? claim.amount) : claim.amount;
    totals[claim.status].count += 1;
  }
  return totals;
}

// Figma 163:1287 – ยอดหนึ่งช่องในแถบยอดรวม (แถบเดียว เส้นแบ่งร่วม ไม่ใช่การ์ดสี่ใบ)
function StatCard({ label, amount, caption }: { label: string; amount: number; caption: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px] bg-white py-[14px] sm:px-[16px] sm:first:pl-0">
      <p className="text-13 text-muted">{label}</p>
      <p className="text-24 font-semibold text-ink tabular-nums">{formatBaht(amount)}</p>
      <p className="text-11 text-muted">{caption}</p>
    </div>
  );
}

function DetailRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[16px] text-13">
      <dt className="text-muted">{label}</dt>
      <dd className={cx('text-right font-semibold', muted ? 'text-muted' : 'text-ink')}>{value}</dd>
    </div>
  );
}

// Figma 163:1276 – "สถิติการขอเบิกรายบุคคล".
/** พนักงานที่ขอเบิกมากที่สุดในช่วงเวลานั้น ใช้เป็นค่าเริ่มต้นแทนคนแรกในรายชื่อ ซึ่งมักไม่มีรายการและทำให้แผงเปิดมาเป็น ฿0 */
function busiestEmployeeId(employees: Employee[], claims: Claim[], period: Period | undefined): string {
  const counts = new Map<string, number>();
  for (const claim of claims) {
    if (period && (claim.date < period.from || claim.date > period.to)) continue;
    counts.set(claim.employeeId, (counts.get(claim.employeeId) ?? 0) + 1);
  }
  let best = employees[0]?.id ?? '';
  for (const employee of employees) {
    if ((counts.get(employee.id) ?? 0) > (counts.get(best) ?? 0)) best = employee.id;
  }
  return best;
}

export function EmployeeClaimStats({ employees, periods, claims }: EmployeeClaimStatsProps) {
  // ช่วงเวลาเริ่มต้น = ช่วงล่าสุดที่มีคำขอเบิก (periods เรียงล่าสุดก่อน) ถ้าไม่มีเลยค่อยใช้ช่วงแรก
  const [initialPeriod] = useState(
    () => periods.find((p) => claims.some((c) => c.date >= p.from && c.date <= p.to)) ?? periods[0],
  );
  const [periodId, setPeriodId] = useState(initialPeriod?.id ?? '');
  const [employeeId, setEmployeeId] = useState(() => busiestEmployeeId(employees, claims, initialPeriod));

  const employee = employees.find((item) => item.id === employeeId);
  const period = periods.find((item) => item.id === periodId);

  const filtered = useMemo(() => {
    if (!employee || !period) return [];
    return claims
      .filter((claim) => claim.employeeId === employee.id && claim.date >= period.from && claim.date <= period.to)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [claims, employee, period]);

  const totals = useMemo(() => summarize(filtered), [filtered]);

  const isEmpty = filtered.length === 0;
  const status = totals.pending.count > 0 ? 'มีรายการรอตรวจสอบ' : 'ตรวจสอบครบแล้ว';
  const employeeLabel = employee ? `${employee.name} (${employee.code})` : '-';

  return (
    <Region aria-labelledby="claim-stats-title">
      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-[4px]">
          <PanelTitle id="claim-stats-title">สถิติการขอเบิกรายบุคคล</PanelTitle>
          <p className="text-13 text-muted">
            {isEmpty
              ? 'พนักงานที่เลือกไม่มีรายการในช่วงนี้'
              : `ยอดของพนักงานที่เลือก ${filtered.length.toLocaleString('th-TH')} รายการ`}
          </p>
        </div>
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <Select
            label="เลือกพนักงาน"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            wrapperClassName="sm:w-[220px]"
            className="!h-[37px] !rounded-[6px]"
          >
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </Select>
          <Select
            label="เลือกช่วงเวลา"
            value={periodId}
            onChange={(event) => setPeriodId(event.target.value)}
            wrapperClassName="sm:w-[180px]"
            className="!h-[37px] !rounded-[6px]"
          >
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* ไม่มีรายการ = บรรทัดเดียว แทนการ์ด ฿0.00 สี่ใบและกล่องรายละเอียดว่าง */}
      {isEmpty ? (
        <p className="border-t border-line pt-[16px] text-13 text-muted">
          {employee?.name ?? 'พนักงานที่เลือก'} ยังไม่มีคำขอเบิกในช่วง {period?.label ?? 'ที่เลือก'} ลองเลือกพนักงานหรือช่วงเวลาอื่น
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="ยอดขอเบิกทั้งหมด" amount={totals.all.amount} caption={`${totals.all.count} รายการในรอบนี้`} />
            <StatCard label="รอตรวจสอบ" amount={totals.pending.amount} caption={`${totals.pending.count} รายการรออนุมัติ`} />
            <StatCard label="อนุมัติแล้ว" amount={totals.approved.amount} caption={`${totals.approved.count} รายการอนุมัติ`} />
            <StatCard label="ปฏิเสธ" amount={totals.rejected.amount} caption={`${totals.rejected.count} รายการปฏิเสธ`} />
          </div>

          <div className="grid items-start gap-[20px] lg:grid-cols-2 lg:gap-0">
            <div className="flex flex-col gap-[10px] lg:pr-[24px]">
              <h3 className="text-14 font-semibold text-ink">รายละเอียด</h3>
              <dl className="flex flex-col gap-[10px]">
                <DetailRow label="พนักงานที่เลือก" value={employeeLabel} />
                <DetailRow label="ช่วงเวลา" value={period?.label ?? '-'} />
                <DetailRow label="สถานะ" value={status} />
              </dl>
            </div>

            <div className="flex flex-col gap-[10px] lg:border-l lg:border-line lg:pl-[24px]">
              <h3 className="text-14 font-semibold text-ink">รายการของพนักงาน</h3>
              <ul className="-mr-[4px] flex max-h-[240px] flex-col divide-y divide-line overflow-y-auto pr-[4px]">
                {filtered.map((claim) => (
                  <li key={claim.id} className="flex items-center justify-between gap-[12px] py-[10px] first:pt-[0px] last:pb-[0px]">
                    <div className="min-w-0">
                      <p className="truncate text-13 font-medium text-ink">{claim.benefit}</p>
                      <p className="text-12 text-muted">{formatThaiDate(claim.date)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-[4px]">
                      <span className="text-13 font-semibold text-ink tabular-nums">{formatBaht(claim.amount)}</span>
                      <StatusBadge status={claim.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Region>
  );
}
