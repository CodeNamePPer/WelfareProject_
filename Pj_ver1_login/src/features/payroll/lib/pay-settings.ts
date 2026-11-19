// การตั้งค่าการจ่ายเงิน: วันจ่ายของแต่ละรอบ (จ่ายตรงวันที่ตั้ง ไม่เลื่อนหนีวันหยุด)
// ใช้ทั้งในหน้า "ตั้งค่าการจ่ายเงิน" และตอนคำนวณกำหนดจ่ายของคำขอ

import type { RoundNo } from "./types";

export interface PaySettings {
  round1PayDay: number; // รอบที่ 1 (ยื่นวันที่ 1–15) จ่ายวันที่เท่าไร
  round1MonthOffset: number; // ... ของเดือนไหน นับจากเดือนที่ยื่น (0 = เดือนเดียวกัน, 1 = เดือนถัดไป, 2 = อีก 2 เดือน ...)
  round2PayDay: number; // รอบที่ 2 (ยื่นวันที่ 16–สิ้นเดือน) จ่ายวันที่เท่าไร
  round2MonthOffset: number; // ... ของเดือนไหน (อย่างน้อย 1 เพราะรอบที่ 2 ปิดรอบสิ้นเดือน)
  cutoffDays?: number; // ปิดรอบก่อนวันจ่ายกี่วัน (ดีไซน์ F02) การเงินอนุมัติหลังวันนี้ ผู้ขอได้เงินรอบถัดไป
}

/** ปิดรอบก่อนวันจ่ายได้มากสุดกี่วัน */
export const MAX_CUTOFF_DAYS = 20;

/** จ่ายช้าสุดได้กี่เดือนหลังเดือนที่ยื่น */
export const MAX_MONTH_OFFSET = 6;

/** 0 -> "เดือนเดียวกัน", 1 -> "เดือนถัดไป", 2 -> "อีก 2 เดือน" */
export function monthOffsetLabel(offset: number) {
  if (offset === 0) return "เดือนเดียวกัน";
  if (offset === 1) return "เดือนถัดไป";
  return `อีก ${offset} เดือน`;
}

/** อ่านค่าของรอบที่ระบุ */
export function roundSetting(s: PaySettings, round: RoundNo) {
  return round === 1 ? { day: s.round1PayDay, offset: s.round1MonthOffset } : { day: s.round2PayDay, offset: s.round2MonthOffset };
}

/**
 * ตรวจค่าที่ตั้ง: วันจ่ายต้องอยู่หลังวันปิดรอบ
 *   รอบที่ 1 ปิดรอบวันที่ 15 -> ถ้าจ่ายเดือนเดียวกัน ต้องจ่ายหลังวันที่ 15
 *   รอบที่ 2 ปิดรอบสิ้นเดือน -> ต้องจ่ายเดือนถัดไปขึ้นไป
 * คืนข้อความ error ของแต่ละรอบ (ไม่มี = ผ่าน)
 */
export function validatePaySettings(s: PaySettings): { round1?: string; round2?: string; cutoff?: string } {
  const errors: { round1?: string; round2?: string; cutoff?: string } = {};
  if (!Number.isInteger(s.round1MonthOffset) || s.round1MonthOffset < 0 || s.round1MonthOffset > MAX_MONTH_OFFSET) {
    errors.round1 = `เดือนที่จ่ายของรอบที่ 1 ต้องเป็น 0–${MAX_MONTH_OFFSET} เดือน`;
  } else if (s.round1MonthOffset === 0 && s.round1PayDay <= 15) {
    errors.round1 = "รอบที่ 1 ปิดรอบวันที่ 15 ถ้าจ่ายเดือนเดียวกันต้องเลือกวันที่ 16 ขึ้นไป";
  }
  if (!Number.isInteger(s.round2MonthOffset) || s.round2MonthOffset < 1 || s.round2MonthOffset > MAX_MONTH_OFFSET) {
    errors.round2 = `รอบที่ 2 ปิดรอบสิ้นเดือน ต้องจ่ายเดือนถัดไปขึ้นไป (1–${MAX_MONTH_OFFSET} เดือน)`;
  }
  for (const [key, day] of [["round1", s.round1PayDay], ["round2", s.round2PayDay]] as const) {
    if (!Number.isInteger(day) || day < 1 || day > 31) errors[key] = "วันจ่ายต้องเป็นวันที่ 1–31";
  }
  const cutoff = s.cutoffDays ?? DEFAULT_PAY_SETTINGS.cutoffDays ?? 0;
  if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > MAX_CUTOFF_DAYS) errors.cutoff = `ปิดรอบก่อนวันจ่ายได้ 0–${MAX_CUTOFF_DAYS} วัน`;
  return errors;
}

/** ค่าเริ่มต้นของระบบ */
export const DEFAULT_PAY_SETTINGS: PaySettings = {
  round1PayDay: 25,
  round1MonthOffset: 0,
  round2PayDay: 10,
  round2MonthOffset: 1,
  cutoffDays: 5,
};

/** วันปิดรอบ = วันจ่าย − cutoffDays ("YYYY-MM-DD") */
export function cutoffDateOf(payDate: string, s: PaySettings) {
  const days = s.cutoffDays ?? DEFAULT_PAY_SETTINGS.cutoffDays ?? 0;
  const date = new Date(`${payDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** จำนวนวันในเดือน (month = 1–12) */
export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * คำนวณวันจ่ายของคำขอที่ยื่นในเดือน (year, month) รอบ round  -> คืนวันที่แบบ ISO "YYYY-MM-DD"
 *   1) เลื่อนเดือนไปตาม MonthOffset ของรอบนั้น (ข้ามปีได้) แล้วใช้วันที่ PayDay ของรอบนั้น
 *   2) ถ้าเดือนนั้นมีไม่ถึงวันที่ตั้ง (เช่น ตั้ง 31 แต่ ก.พ. มี 28 วัน) ใช้วันสุดท้ายของเดือน
 */
export function resolvePayDate(year: number, month: number, round: RoundNo, s: PaySettings): string {
  const { day: wanted, offset } = roundSetting(s, round);
  const total = month - 1 + offset; // นับเดือนแบบ 0–11 แล้วทดปี
  const y = year + Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${pad(m)}-${pad(Math.min(wanted, daysInMonth(y, m)))}`;
}
