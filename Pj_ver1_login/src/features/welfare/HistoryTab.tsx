import Link from 'next/link';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatShortThaiDate } from '../../lib/format';
import type { AuditEntry } from '../../types';

// Welfare-related entries from the audit log; the full log lives at /admin/logs.
export function HistoryTab({ entries }: { entries: AuditEntry[] }) {
  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-[17px] font-semibold text-ink">
            ประวัติการแก้ไขสวัสดิการ
          </h2>
          <p className="mt-[4px] text-[12px] text-muted">การเพิ่ม แก้ไข และนำเข้าข้อมูลสวัสดิการ</p>
        </div>
        <Link href="/admin/logs" className="shrink-0 text-[13px] font-medium text-primary-700 hover:underline">
          ดู Log ทั้งหมด
        </Link>
      </header>
      {entries.length === 0 ? (
        <p className="py-[32px] text-center text-[13px] text-muted">ยังไม่มีประวัติ</p>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>วันที่</th>
                <th scope="col" className={table.th}>ผู้ดำเนินการ</th>
                <th scope="col" className={table.th}>รายการ</th>
                <th scope="col" className={table.th}>ก่อน → หลัง</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={cx(table.row, table.rowHover)}>
                  <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>{formatShortThaiDate(entry.at)}</td>
                  <td className={cx(table.td, 'whitespace-nowrap')}>{entry.actor}</td>
                  <td className={table.td}>
                    <p>{entry.title}</p>
                    <p className="text-[12px] text-muted">{entry.detail}</p>
                  </td>
                  <td className={cx(table.td, 'text-muted')}>
                    {entry.change ? `${entry.change.before} → ${entry.change.after}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
