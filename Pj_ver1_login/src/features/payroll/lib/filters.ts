// ตัวเลือกใน dropdown และฟังก์ชันกรองข้อมูลที่ใช้ซ้ำหลายหน้า

import type { Option } from "@/features/payroll/components/ui/Field";
import { ROUND_LABEL, STATUS_META, WELFARE_OPTIONS } from "./constants";
import type { PaymentRequest, PaymentStatus } from "./types";

/** ค่าพิเศษของตัวเลือก "ทั้งหมด" */
export const ALL = "all";

export const ROUND_OPTIONS: Option[] = [
  { value: ALL, label: "ทุกรอบ" },
  { value: "1", label: ROUND_LABEL[1] },
  { value: "2", label: ROUND_LABEL[2] },
];

export const WELFARE_FILTER_OPTIONS: Option[] = [{ value: ALL, label: "ทุกประเภท" }, ...WELFARE_OPTIONS];

export function statusOptions(statuses: PaymentStatus[], allLabel = "สถานะทั้งหมด"): Option[] {
  return [{ value: ALL, label: allLabel }, ...statuses.map((s) => ({ value: s, label: STATUS_META[s].label }))];
}

export interface RequestFilter {
  q?: string; // ค้นหาชื่อ / เลขที่คำขอ / รหัสพนักงาน
  round?: string; // "1" | "2" | ALL
  welfare?: string;
  status?: string;
  requestDate?: string; // ISO วันเดียว
  payFrom?: string; // ISO ช่วงวันที่จ่าย
  payTo?: string;
}

/**
 * กรองรายการคำขอตามเงื่อนไขที่ส่งมา
 * เงื่อนไขที่ว่าง หรือเป็น ALL = ไม่กรองข้อนั้น
 */
export function filterRequests(rows: PaymentRequest[], f: RequestFilter): PaymentRequest[] {
  const q = f.q?.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && ![r.id, r.employeeName, r.employeeId, r.department].some((v) => v.toLowerCase().includes(q))) return false;
    if (f.round && f.round !== ALL && String(r.round) !== f.round) return false;
    if (f.welfare && f.welfare !== ALL && r.welfare !== f.welfare) return false;
    if (f.status && f.status !== ALL && r.status !== f.status) return false;
    if (f.requestDate && r.requestDate !== f.requestDate) return false;
    if (f.payFrom && r.payDate < f.payFrom) return false; // เทียบสตริง ISO ได้ตรงตามลำดับวันที่
    if (f.payTo && r.payDate > f.payTo) return false;
    return true;
  });
}

/** รวมยอดเงิน */
export function sumBy<T>(rows: T[], pick: (r: T) => number): number {
  return rows.reduce((total, r) => total + pick(r), 0);
}
