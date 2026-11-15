'use client';

import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import type { ClaimDbStatus } from '@/lib/claims/types';
import { useToast } from '@/components/ui/Toast';
import { Button, Card, CardHeader, PageHeader, Select, StatRow, StatTile, Tabs, labelClass } from '@/features/hr/ui';
import { BarChart, type BarDatum } from '@/features/finance/BarChart';
import { downloadTable, type ExportCell, type ExportFormat } from '@/features/payroll/lib/export-excel';

export type ExportClaim = {
  claimNo: string;
  /** ปี พ.ศ. ของรอบ */
  year: number;
  month: number;
  roundNo: 1 | 2;
  status: ClaimDbStatus;
  statusLabel: string;
  code: string;
  name: string;
  department: string;
  benefit: string;
  amount: number;
  payDate: string;
  /** วันจ่าย YYYY-MM-DD ใช้จัดกลุ่มกราฟ */
  payDateIso: string | null;
  bankCode: string;
  accountMasked: string;
  transferRef: string;
};

export type ExportAdvance = { claimNo: string; code: string; name: string; department: string; benefit: string; amount: number; paidAt: string; dueDate: string; status: string };

type Report = 'bank' | 'benefit' | 'department' | 'advance';
const REPORTS: { id: Report; label: string }[] = [
  { id: 'bank', label: 'ไฟล์จ่ายธนาคาร' },
  { id: 'benefit', label: 'สรุปตามสวัสดิการ' },
  { id: 'department', label: 'สรุปตามแผนก' },
  { id: 'advance', label: 'เบิกล่วงหน้าคงค้าง' },
];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
/** ไฟล์จ่ายธนาคารมีเฉพาะรายการที่การเงินอนุมัติแล้ว */
const BANK: ClaimDbStatus[] = ['awaiting_payment', 'paid'];
/** แสดงตัวอย่างไม่เกินกี่แถว (ไฟล์มีครบทุกแถว) */
const PREVIEW_ROWS = 50;

/** ตารางที่จะส่งออก: หน้าจอแสดงตารางนี้ และไฟล์ทั้ง .csv / .xlsx สร้างจากตารางเดียวกัน */
type Table = { fileName: string; headers: string[]; rows: ExportCell[][]; numeric: boolean[] };

function groupTable(rows: ExportClaim[], key: (row: ExportClaim) => string, label: string, fileName: string): Table {
  const map = new Map<string, { count: number; amount: number }>();
  for (const row of rows) {
    const group = map.get(key(row)) ?? { count: 0, amount: 0 };
    group.count += 1;
    group.amount += row.amount;
    map.set(key(row), group);
  }
  return {
    fileName,
    headers: [label, 'จำนวนรายการ', 'ยอดรวม'],
    rows: [...map.entries()].sort((a, b) => b[1].amount - a[1].amount).map(([name, group]) => [name, group.count, group.amount]),
    numeric: [false, true, true],
  };
}

type Period = 'day' | 'month' | 'year';
const SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * จัดกลุ่มยอดจ่ายเป็นแท่งกราฟตามวันจ่าย (กราฟเดิมของหน้า Export)
 *   day   -> ทุกวันของเดือนที่เลือก
 *   month -> 12 เดือนของปีที่เลือก
 *   year  -> ทุกปีที่มีข้อมูล
 */
function groupForChart(rows: ExportClaim[], period: Period, ce: number, month: number, years: number[]): BarDatum[] {
  const bucket = (prefix: string, label: string): BarDatum => {
    const items = rows.filter((row) => row.payDateIso?.startsWith(prefix));
    return { label, value: items.reduce((sum, row) => sum + row.amount, 0), detail: `${items.length} รายการ` };
  };
  if (period === 'year') return years.map((be) => bucket(`${be - 543}-`, String(be)));
  if (period === 'month') return SHORT_MONTHS.map((label, index) => bucket(`${ce}-${pad(index + 1)}-`, label));
  const days = new Date(Date.UTC(ce, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => bucket(`${ce}-${pad(month)}-${pad(index + 1)}`, String(index + 1)));
}

const formatCell = (value: ExportCell, numeric: boolean) => (numeric && typeof value === 'number' ? value.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : String(value || '—'));

export function ExportClient({ claims, outstanding, payDates, initial }: { claims: ExportClaim[]; outstanding: ExportAdvance[]; payDates: Record<string, string>; initial: { year: number; month: number } }) {
  const { notify } = useToast();
  const years = [...new Set([initial.year, ...claims.map((row) => row.year)])].sort((a, b) => b - a);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [round, setRound] = useState<'1' | '2' | 'all'>('all');
  const [report, setReport] = useState<Report>('bank');
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  const ce = year - 543;
  const inRange = claims.filter((row) => row.year === year && row.month === month && (round === 'all' || String(row.roundNo) === round));
  const rows = report === 'bank' ? inRange.filter((row) => BANK.includes(row.status)) : inRange;
  const count = report === 'advance' ? outstanding.length : rows.length;
  const total = report === 'advance' ? outstanding.reduce((sum, row) => sum + row.amount, 0) : rows.reduce((sum, row) => sum + row.amount, 0);
  const roundLabel = (no: 1 | 2) => {
    const date = payDates[`${ce}-${month}-${no}`];
    return `รอบที่ ${no}${date ? ` (จ่าย ${date})` : ''}`;
  };
  const suffix = `${year}-${String(month).padStart(2, '0')}${round === 'all' ? '' : `-รอบ${round}`}`;

  const table: Table =
    report === 'advance'
      ? {
          fileName: 'เบิกล่วงหน้าคงค้าง',
          headers: ['เลขคำขอ', 'รหัสพนักงาน', 'ชื่อ', 'แผนก', 'สวัสดิการ', 'ยอดจ่ายล่วงหน้า', 'จ่ายเมื่อ', 'ครบกำหนดใบเสร็จ', 'สถานะ'],
          rows: outstanding.map((row) => [row.claimNo, row.code, row.name, row.department, row.benefit, row.amount, row.paidAt, row.dueDate, row.status]),
          numeric: [false, false, false, false, false, true, false, false, false],
        }
      : report === 'bank'
        ? {
            fileName: `ไฟล์จ่ายธนาคาร-${suffix}`,
            headers: ['เลขคำขอ', 'รหัสพนักงาน', 'ชื่อผู้รับ', 'ธนาคาร', 'เลขบัญชี', 'ยอดเงิน', 'วันจ่าย', 'สถานะ', 'เลขอ้างอิงการโอน'],
            rows: rows.map((row) => [row.claimNo, row.code, row.name, row.bankCode, row.accountMasked, row.amount, row.payDate, row.statusLabel, row.transferRef]),
            numeric: [false, false, false, false, false, true, false, false, false],
          }
        : report === 'benefit'
          ? groupTable(rows, (row) => row.benefit, 'สวัสดิการ', `สรุปตามสวัสดิการ-${suffix}`)
          : groupTable(rows, (row) => row.department, 'แผนก', `สรุปตามแผนก-${suffix}`);

  const download = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await downloadTable(table.fileName, table.headers, table.rows, format);
    } catch {
      notify('สร้างไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    setBusy(null);
  };

  const preview = table.rows.slice(0, PREVIEW_ROWS);

  // กราฟและตัวเลขสรุป: ยอดที่การเงินอนุมัติแล้ว (รอจ่าย + จ่ายแล้ว) ตามวันจ่าย
  const approved = claims.filter((row) => BANK.includes(row.status));
  const chartYears = [...new Set(approved.flatMap((row) => (row.payDateIso ? [Number(row.payDateIso.slice(0, 4)) + 543] : [])))].sort((a, b) => a - b);
  const chart = groupForChart(approved, period, ce, month, chartYears.length > 0 ? chartYears : [year]);
  const scoped = approved.filter((row) => row.payDateIso?.startsWith(period === 'day' ? `${ce}-${pad(month)}-` : period === 'month' ? `${ce}-` : ''));
  const chartCaption = period === 'day' ? `รายวัน · ${MONTHS[month - 1]} ${year}` : period === 'month' ? `รายเดือน · ปี ${year}` : 'รายปี · ทุกปีที่มีข้อมูล';
  const reportLabel = REPORTS.find((item) => item.id === report)?.label ?? '';

  return (
    <>
      <PageHeader title="Export รายงาน (Excel)" description="เลือกช่วงข้อมูล ตรวจรายการที่จะส่งออก แล้วดาวน์โหลดเป็น .xlsx หรือ .csv" />

      <Card className="flex flex-col gap-4 p-5">
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Select label="ปีงบประมาณ" value={String(year)} onChange={(event) => setYear(Number(event.target.value))} disabled={report === 'advance'}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select label="เดือน" value={String(month)} onChange={(event) => setMonth(Number(event.target.value))} disabled={report === 'advance'}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
          <Select label="รอบการเบิก" value={round} onChange={(event) => setRound(event.target.value as '1' | '2' | 'all')} disabled={report === 'advance'}>
            <option value="1">{roundLabel(1)}</option>
            <option value="2">{roundLabel(2)}</option>
            <option value="all">ทั้งเดือน</option>
          </Select>
        </div>

        <div>
          <p className={labelClass}>ประเภทรายงาน</p>
          <div role="radiogroup" aria-label="ประเภทรายงาน" className="flex flex-wrap gap-2">
            {REPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={report === item.id}
                onClick={() => setReport(item.id)}
                className={cx('h-9 rounded-full px-3.5 text-13', report === item.id ? 'border-[1.5px] border-[#1D4ED8] bg-[#EFF6FF] text-[#1E40AF]' : 'border border-[#CBD5E1] bg-white')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="rounded-[8px] bg-[#F8FAFC] px-3.5 py-3 text-13">
          พบ {count} รายการ · ยอดรวม {baht(total)} · ไม่รวมข้อมูลสุขภาพ{report === 'advance' ? ' · รายการคงค้างทั้งหมด ไม่แยกตามเดือน' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download('xlsx')} disabled={table.rows.length === 0 || busy !== null}>
            {busy === 'xlsx' ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลด Excel (.xlsx)'}
          </Button>
          <Button variant="secondary" onClick={() => download('csv')} disabled={table.rows.length === 0 || busy !== null}>
            {busy === 'csv' ? 'กำลังสร้างไฟล์…' : 'ดาวน์โหลด CSV'}
          </Button>
        </div>
      </Card>

      <Card aria-labelledby="export-summary-title" className="flex flex-col gap-5 pb-5">
        <CardHeader titleId="export-summary-title" title="สรุปรายงาน" description="ยอดที่การเงินอนุมัติแล้ว (รอจ่าย + จ่ายแล้ว) ตามวันจ่าย" />
        <div className="-mt-2">
          <Tabs
            label="ช่วงเวลาของกราฟ"
            value={period}
            onChange={setPeriod}
            items={[
              { id: 'day', label: 'รายวัน' },
              { id: 'month', label: 'รายเดือน' },
              { id: 'year', label: 'รายปี' },
            ]}
          />
        </div>
        <div className="px-5">
          <StatRow>
            <StatTile label="จำนวนรายการทั้งหมด" value={String(scoped.length)} note="รายการ" />
            <StatTile label="ยอดรวมการจ่าย" value={baht(scoped.reduce((sum, row) => sum + row.amount, 0))} note={chartCaption} />
            <StatTile label="จำนวนพนักงาน" value={String(new Set(scoped.map((row) => row.code)).size)} note="คน" />
          </StatRow>
        </div>
        <div className="px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-13 font-semibold">สรุปยอดรายจ่าย (บาท)</h3>
            <p className="text-12 text-muted">{chartCaption}</p>
          </div>
          {chart.every((bar) => bar.value === 0) ? (
            <p className="py-10 text-center text-13 text-muted">ไม่มีข้อมูลในช่วงนี้</p>
          ) : (
            <BarChart data={chart} title={`สรุปยอดรายจ่าย ${chartCaption}`} formatValue={(value) => baht(value)} />
          )}
        </div>
      </Card>

      <Card aria-labelledby="export-preview-title">
        <CardHeader
          titleId="export-preview-title"
          title="ตัวอย่างไฟล์ที่จะส่งออก"
          description={`${reportLabel} · ${table.headers.length} คอลัมน์ · ${table.rows.length} แถว${table.rows.length > PREVIEW_ROWS ? ` (แสดง ${PREVIEW_ROWS} แถวแรก ไฟล์มีครบทุกแถว)` : ''} · ${table.fileName}`}
          className="pb-3"
        />
        {table.rows.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-10 text-center text-13 text-muted">ไม่มีข้อมูลในช่วงที่เลือก</p>
        ) : (
          <div className="max-h-[480px] overflow-auto border-t border-line">
            <table className="w-full min-w-max border-collapse text-13">
              <thead className="sticky top-0 bg-[#F8FAFC] text-12 text-muted">
                <tr>
                  {table.headers.map((header, index) => (
                    <th key={header} scope="col" className={cx('px-4 py-2 font-medium whitespace-nowrap', table.numeric[index] ? 'text-right' : 'text-left')}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-[#F1F5F9]">
                    {row.map((cell, index) => (
                      <td key={index} className={cx('px-4 py-2 whitespace-nowrap', table.numeric[index] ? 'text-right tabular-nums' : 'text-left')}>
                        {formatCell(cell, table.numeric[index])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
