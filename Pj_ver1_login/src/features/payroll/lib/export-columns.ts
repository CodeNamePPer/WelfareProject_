import { ROUND_LABEL, STATUS_META, WELFARE_LABEL } from "./constants";
import { formatThaiDate } from "./format";
import type { ExportColumn } from "./export-excel";
import type { PaymentRequest } from "./types";

/** คอลัมน์มาตรฐานเวลา Export รายการคำขอเป็น Excel (ใช้ร่วมกันทุกหน้า) */
export const REQUEST_EXPORT_COLUMNS: ExportColumn<PaymentRequest>[] = [
  { header: "เลขที่คำขอ", value: (r) => r.id },
  { header: "รหัสพนักงาน", value: (r) => r.employeeId },
  { header: "ชื่อพนักงาน", value: (r) => r.employeeName },
  { header: "แผนก / ฝ่าย", value: (r) => r.department },
  { header: "สวัสดิการ", value: (r) => WELFARE_LABEL[r.welfare] },
  { header: "รอบ", value: (r) => ROUND_LABEL[r.round] },
  { header: "วันที่ขอ", value: (r) => formatThaiDate(r.requestDate) },
  { header: "วันที่จ่าย", value: (r) => formatThaiDate(r.payDate) },
  { header: "ยอดเบิก (บาท)", value: (r) => r.amount },
  { header: "จ่ายจริง (บาท)", value: (r) => r.paidAmount },
  { header: "สถานะ", value: (r) => STATUS_META[r.status].label },
];
