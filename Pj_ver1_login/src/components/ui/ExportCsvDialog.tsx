'use client';

import { TriangleAlert } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface ExportCsvDialogProps {
  open: boolean;
  rowCount: number;
  /** Counting word for the rows, e.g. "คน", "รายการ", "บันทึก". */
  unit: string;
  columns: string[];
  /** What personal data the file holds, e.g. "อีเมลและเบอร์โทร". Omit when there is none. */
  personalData?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Summary shown before every CSV download: how many rows, which columns, and a PDPA note
// when the file carries personal data – so nobody takes data out of the system without seeing what it is.
export function ExportCsvDialog({ open, rowCount, unit, columns, personalData, onConfirm, onCancel }: ExportCsvDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={`ส่งออก ${rowCount.toLocaleString('th-TH')} ${unit} เป็น CSV?`}
      confirmLabel="ดาวน์โหลด"
      onConfirm={onConfirm}
      onCancel={onCancel}
      description={
        <dl className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[6px]">
            <dt className="text-12 font-medium text-ink">คอลัมน์ ({columns.length})</dt>
            <dd className="flex flex-wrap gap-[4px]">
              {columns.map((column) => (
                <span key={column} className="rounded-[4px] bg-surface px-[6px] py-[2px] text-12 text-ink ring-1 ring-inset ring-line">
                  {column}
                </span>
              ))}
            </dd>
          </div>
          {personalData ? (
            <div className="flex gap-[8px] rounded-[8px] bg-status-pending-soft px-[10px] py-[8px] text-12 text-status-pending-ink">
              <TriangleAlert className="mt-[1px] size-[14px] shrink-0" aria-hidden="true" />
              <p>มีข้อมูลส่วนบุคคล ({personalData}) โปรดเก็บไฟล์อย่างปลอดภัยและใช้ตามวัตถุประสงค์ของงานเท่านั้น</p>
            </div>
          ) : null}
        </dl>
      }
    />
  );
}
