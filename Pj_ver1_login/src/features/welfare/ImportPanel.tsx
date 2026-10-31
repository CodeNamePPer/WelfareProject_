'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { Tag } from '../../components/ui/Tag';
import type { TagTone } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { ImportRecord, ImportStatus } from '../../types';

const PAGE_SIZE = 7;

const statusTag: Record<ImportStatus, { label: string; tone: TagTone }> = {
  approved: { label: 'อนุมัติ', tone: 'success' },
  'needs-fix': { label: 'รอแก้ไข', tone: 'warning' },
  rejected: { label: 'ปฏิเสธ', tone: 'danger' },
};

type Phase = 'idle' | 'review' | 'done';

const phaseTag: Record<Phase, { label: string; tone: TagTone }> = {
  idle: { label: 'ยังไม่เลือกไฟล์', tone: 'neutral' },
  review: { label: 'รอตรวจสอบข้อมูล', tone: 'warning' },
  done: { label: 'นำเข้าแล้ว', tone: 'success' },
};

interface ImportPanelProps {
  /** Rows shown for review. File parsing is not connected yet, so the preview is sample data. */
  preview: ImportRecord[];
  onImported: (count: number) => void;
}

// Figma 163:180 – "นำเข้าประวัติย้อนหลัง" card.
export function ImportPanel({ preview, onImported }: ImportPanelProps) {
  const csvRef = useRef<HTMLInputElement>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [page, setPage] = useState(1);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setPhase('review');
    setPage(1);
  };

  const confirm = () => {
    onImported(preview.length);
    setPhase('done');
  };

  const rows = phase === 'idle' ? [] : paginate(preview, page, PAGE_SIZE);
  const tag = phaseTag[phase];

  return (
    <section aria-labelledby="import-title" className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="import-title" className="text-[17px] font-semibold text-ink">
            นำเข้าประวัติย้อนหลัง
          </h2>
          <p className="mt-[4px] text-[12px] text-muted">เลือกไฟล์ CSV หรือ Excel แล้วตรวจสอบข้อมูลก่อนยืนยัน</p>
        </div>
        <Tag tone={tag.tone}>{tag.label}</Tag>
      </header>

      <div className="flex flex-wrap items-center gap-[10px]">
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} onChange={onPick} />
        <input
          ref={excelRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="sr-only"
          tabIndex={-1}
          onChange={onPick}
        />
        <Button variant="tonal" className="w-[160px]" onClick={() => csvRef.current?.click()} disabled={phase === 'done'}>
          เลือกไฟล์ CSV
        </Button>
        <Button className="w-[160px]" onClick={() => excelRef.current?.click()} disabled={phase === 'done'}>
          เลือกไฟล์ Excel
        </Button>
        <Button
          variant="primary"
          className="w-[160px] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={confirm}
          disabled={phase !== 'review'}
        >
          ยืนยันการนำเข้า
        </Button>
        {fileName ? (
          <p className="text-[12px] text-muted">
            ไฟล์: <span className="font-medium text-ink">{fileName}</span>
            {phase === 'done' ? (
              <button
                type="button"
                className="ml-2 text-primary-700 hover:underline"
                onClick={() => {
                  setFileName('');
                  setPhase('idle');
                }}
              >
                นำเข้าไฟล์อื่น
              </button>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="rounded-[8px] bg-surface px-[12px] py-[10px]">
        <p className="text-[12px] font-medium text-ink">หมายเหตุการนำเข้า</p>
        <p className="mt-[2px] text-[11px] text-muted">
          ระบบจะนำเข้าข้อมูลเบิกย้อนหลังโดยไม่เปลี่ยนสถานะอนุมัติเดิม และไม่ส่งผลต่อการอนุมัติคำขอใหม่
        </p>
      </div>

      {phase === 'idle' ? (
        <p className="rounded-[8px] border border-dashed border-line px-[16px] py-[32px] text-center text-[13px] text-muted">
          เลือกไฟล์เพื่อดูตัวอย่างข้อมูลก่อนนำเข้า
        </p>
      ) : (
        <>
          <div className={table.wrapper}>
            <table className={table.table}>
              <caption className="sr-only">ตัวอย่างข้อมูลที่จะนำเข้า</caption>
              <thead>
                <tr>
                  <th scope="col" className={table.th}>เลขที่</th>
                  <th scope="col" className={table.th}>วันที่</th>
                  <th scope="col" className={table.th}>สวัสดิการ</th>
                  <th scope="col" className={table.th}>ผู้เบิก</th>
                  <th scope="col" className={table.th}>เบิก</th>
                  <th scope="col" className={table.th}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((record) => (
                  <tr key={record.id} className={cx(table.row, table.rowHover)}>
                    <td className={cx(table.td, 'font-semibold whitespace-nowrap')}>{record.id}</td>
                    <td className={cx(table.td, 'whitespace-nowrap text-muted tabular-nums')}>{formatShortThaiDate(record.date)}</td>
                    <td className={table.td}>{record.benefit}</td>
                    <td className={cx(table.td, 'text-muted')}>{record.claimant}</td>
                    <td className={cx(table.td, 'whitespace-nowrap tabular-nums')}>{formatBahtWhole(record.amount)}</td>
                    <td className={table.td}>
                      <Tag tone={statusTag[record.status].tone}>{statusTag[record.status].label}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={preview.length} onChange={setPage} />
        </>
      )}
    </section>
  );
}
