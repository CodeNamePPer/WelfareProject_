import { StatusBadge } from '../../components/ui/StatusBadge';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { Claim, Employee } from '../../types';

// Admin sees claims read-only: approval belongs to HR / Finance.
export function ClaimsTab({ claims, employees }: { claims: Claim[]; employees: Employee[] }) {
  const nameOf = new Map(employees.map((employee) => [employee.id, `${employee.name} (${employee.code})`]));
  const sorted = [...claims].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section aria-labelledby="claims-title" className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]">
      <header>
        <h2 id="claims-title" className="text-17 font-semibold text-ink">
          คำขอเบิกล่าสุด
        </h2>
        <p className="mt-[4px] text-12 text-muted">ดูได้อย่างเดียว · การอนุมัติทำโดย HR และฝ่ายการเงิน</p>
      </header>
      <div className={table.wrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th scope="col" className={table.th}>วันที่</th>
              <th scope="col" className={table.th}>ผู้เบิก</th>
              <th scope="col" className={table.th}>สวัสดิการ</th>
              <th scope="col" className={table.th}>จำนวนเงิน</th>
              <th scope="col" className={table.th}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((claim) => (
              <tr key={claim.id} className={cx(table.row, table.rowHover)}>
                <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>{formatShortThaiDate(claim.date)}</td>
                <td className={table.td}>{nameOf.get(claim.employeeId) ?? claim.employeeId}</td>
                <td className={table.td}>{claim.benefit}</td>
                <td className={cx(table.td, 'whitespace-nowrap tabular-nums')}>{formatBahtWhole(claim.amount)}</td>
                <td className={table.td}>
                  <StatusBadge status={claim.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={table.cards}>
        {sorted.map((claim) => (
          <li key={claim.id} className={table.card}>
            <div className="flex items-start justify-between gap-[8px]">
              <div className="min-w-0">
                <p className="font-semibold">{claim.benefit}</p>
                <p className="text-12 text-muted">{nameOf.get(claim.employeeId) ?? claim.employeeId}</p>
              </div>
              <StatusBadge status={claim.status} />
            </div>
            <div className="mt-[8px] flex items-center justify-between gap-[8px]">
              <span className="font-semibold tabular-nums">{formatBahtWhole(claim.amount)}</span>
              <span className="text-11 text-muted tabular-nums">{formatShortThaiDate(claim.date)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
