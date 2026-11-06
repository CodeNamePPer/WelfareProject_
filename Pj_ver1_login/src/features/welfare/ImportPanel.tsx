'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination, paginate } from '../../components/ui/Pagination';
import { Tag } from '../../components/ui/Tag';
import type { TagTone } from '../../components/ui/Tag';
import { table } from '../../components/ui/table';
import { isCsvFile } from '../../lib/csv';
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
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(false);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isCsvFile(file)) {
      setFileError(`ไม่รองรับไฟล์ "${file.name}" ระบบนำเข้าได้เฉพาะไฟล์ .csv เท่านั้น`);
      return;
    }
    setFileError('');
    setFileName(file.name);
    setPhase('review');
    setPage(1);
  };

  const confirm = () => {
    setConfirming(false);
    onImported(preview.length);
    setPhase('done');
  };

  const rows = phase === 'idle' ? [] : paginate(preview, page, PAGE_SIZE);
  const tag = phaseTag[phase];

  return (
    <section aria-labelledby="import-title" className="flex flex-col gap-[16px] border-b border-line p-[16px] sm:p-[20px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="import-title" className="text-17 font-semibold text-ink">
            นำเข้าประวัติย้อนหลัง
          </h2>
          <p className="mt-[4px] text-12 text-muted">เลือกไฟล์ CSV แล้วตรวจสอบข้อมูลก่อนยืนยัน</p>
        </div>
        <Tag tone={tag.tone}>{tag.label}</Tag>
      </header>

      <div className="flex flex-wrap items-center gap-[10px]">
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} onChange={onPick} />
        <Button variant="tonal" className="flex-1 sm:w-[160px] sm:flex-none" onClick={() => csvRef.current?.click()} disabled={phase === 'done'}>
          เลือกไฟล์ CSV
        </Button>
        <Button
          variant="primary"
          className="flex-1 sm:w-[160px] sm:flex-none disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setConfirming(true)}
          disabled={phase !== 'review'}
        >
          ยืนยันการนำเข้า
        </Button>
        {fileName ? (
          <p className="text-12 text-muted">
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

      {fileError ? (
        <p role="alert" className="-mt-[6px] text-12 text-danger">
          {fileError}
        </p>
      ) : null}

      <div className="rounded-[8px] bg-surface px-[12px] py-[10px]">
        <p className="text-12 font-medium text-ink">หมายเหตุการนำเข้า</p>
        <p className="mt-[2px] text-11 text-muted">
          ระบบจะนำเข้าข้อมูลเบิกย้อนหลังโดยไม่เปลี่ยนสถานะอนุมัติเดิม และไม่ส่งผลต่อการอนุมัติคำขอใหม่
        </p>
      </div>

      {phase === 'idle' ? (
        <p className="text-13 text-muted">
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
          <ul className={table.cards} aria-label="ตัวอย่างข้อมูลที่จะนำเข้า">
            {rows.map((record) => (
              <li key={record.id} className={table.card}>
                <div className="flex items-start justify-between gap-[8px]">
                  <div className="min-w-0">
                    <p className="font-semibold">{record.benefit}</p>
                    <p className="text-12 text-muted">
                      {record.id}, {record.claimant}
                    </p>
                  </div>
                  <Tag tone={statusTag[record.status].tone}>{statusTag[record.status].label}</Tag>
                </div>
                <div className="mt-[8px] flex items-center justify-between gap-[8px]">
                  <span className="font-semibold tabular-nums">{formatBahtWhole(record.amount)}</span>
                  <span className="text-11 text-muted tabular-nums">{formatShortThaiDate(record.date)}</span>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={preview.length} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title={`นำเข้า ${preview.length.toLocaleString('th-TH')} รายการ?`}
        description={
          <>
            จากไฟล์ <span className="font-medium text-ink">{fileName}</span> เมื่อนำเข้าแล้วจะยกเลิกจากหน้านี้ไม่ได้
            กรุณาตรวจตัวอย่างข้อมูลให้ครบก่อนยืนยัน
          </>
        }
        confirmLabel="ยืนยันการนำเข้า"
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
    </section>
  );
}
