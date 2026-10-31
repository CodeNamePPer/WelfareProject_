'use client';

import { useMemo, useState } from 'react';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cx } from '../../lib/cx';
import { formatBaht, formatThaiDate } from '../../lib/format';
import { Panel, PanelTitle } from './ui';
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
    totals[claim.status].amount += claim.amount;
    totals[claim.status].count += 1;
  }
  return totals;
}

// Figma 163:1287 – StatCard (radius 8, padding 16, gap 6).
function StatCard({ label, amount, caption }: { label: string; amount: number; caption: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px] rounded-[8px] border border-line bg-white p-[16px]">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-[24px] font-semibold text-ink tabular-nums">{formatBaht(amount)}</p>
      <p className="text-[11px] text-muted">{caption}</p>
    </div>
  );
}

function DetailRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-[16px] text-[13px]">
      <dt className="text-muted">{label}</dt>
      <dd className={cx('text-right font-semibold', muted ? 'text-muted' : 'text-ink')}>{value}</dd>
    </div>
  );
}

// Figma 163:1276 – "สถิติการขอเบิกรายบุคคล".
export function EmployeeClaimStats({ employees, periods, claims }: EmployeeClaimStatsProps) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '');

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
  const status = isEmpty ? 'ว่าง' : totals.pending.count > 0 ? 'มีรายการรอตรวจสอบ' : 'ตรวจสอบครบแล้ว';
  const employeeLabel = employee ? `${employee.name} · ${employee.code}` : '-';

  return (
    <Panel aria-labelledby="claim-stats-title">
      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-[4px]">
          <PanelTitle id="claim-stats-title">สถิติการขอเบิกรายบุคคล</PanelTitle>
          <p className="text-[13px] text-muted">
            ยอดรวมเป็นของพนักงานที่เลือกเท่านั้น ·{' '}
            {isEmpty ? 'ไม่มีข้อมูลแสดง 0' : `แสดง ${filtered.length.toLocaleString('th-TH')} รายการ`}
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
                {item.name} · {item.code}
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

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ยอดขอเบิกทั้งหมด" amount={totals.all.amount} caption={`${totals.all.count} รายการในรอบนี้`} />
        <StatCard label="รอตรวจสอบ" amount={totals.pending.amount} caption={`${totals.pending.count} รายการรออนุมัติ`} />
        <StatCard label="อนุมัติแล้ว" amount={totals.approved.amount} caption={`${totals.approved.count} รายการอนุมัติ`} />
        <StatCard label="ปฏิเสธ" amount={totals.rejected.amount} caption={`${totals.rejected.count} รายการปฏิเสธ`} />
      </div>

      <div className="grid items-start gap-[12px] lg:grid-cols-2">
        <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-white p-[16px]">
          <h3 className="text-[14px] font-semibold text-ink">รายละเอียด</h3>
          <dl className="flex flex-col gap-[10px]">
            <DetailRow label="พนักงานที่เลือก" value={employeeLabel} />
            <DetailRow label="ช่วงเวลา" value={period?.label ?? '-'} />
            <DetailRow label="สถานะ" value={status} muted={isEmpty} />
          </dl>
        </div>

        <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-white p-[16px]">
          <h3 className="text-[14px] font-semibold text-ink">รายการของพนักงาน</h3>
          {isEmpty ? (
            <div className="flex flex-col gap-[8px] text-[13px] text-muted">
              <p>ยังไม่มีข้อมูลขอเบิกของพนักงานที่เลือก</p>
              <p>เลือกพนักงานและช่วงเวลาเพื่อดูสถิติและรายการของคนนั้น</p>
            </div>
          ) : (
            <ul className="-mr-[4px] flex max-h-[240px] flex-col divide-y divide-line overflow-y-auto pr-[4px]">
              {filtered.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between gap-[12px] py-[10px] first:pt-[0px] last:pb-[0px]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{claim.benefit}</p>
                    <p className="text-[12px] text-muted">{formatThaiDate(claim.date)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-[4px]">
                    <span className="text-[13px] font-semibold text-ink tabular-nums">{formatBaht(claim.amount)}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
