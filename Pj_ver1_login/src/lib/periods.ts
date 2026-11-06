import type { Period } from "../types";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const pad = (n: number) => String(n).padStart(2, "0");

/** ปี/เดือนปัจจุบันตามเวลาไทย – เซิร์ฟเวอร์อาจรันเป็น UTC ซึ่งช่วงหัวค่ำวันสิ้นเดือนจะยังเป็นเดือนเก่า */
function todayInBangkok(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "numeric" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month") };
}

/**
 * ตัวเลือกช่วงเวลาของสถิติรายบุคคล สร้างจากวันนี้แทนรายการตายตัว:
 * ทุกเดือนตั้งแต่ ม.ค. ของปีก่อนหน้าจนถึงเดือนนี้ (ล่าสุดก่อน) และทั้งปีของแต่ละปี
 */
export function buildPeriods(now = new Date(), yearsBack = 1): Period[] {
  const { year, month } = todayInBangkok(now);
  const months: Period[] = [];
  for (let y = year; y >= year - yearsBack; y -= 1) {
    for (let m = y === year ? month : 12; m >= 1; m -= 1) {
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      months.push({
        id: `${y}-${pad(m)}`,
        label: `${MONTHS_TH[m - 1]} ${y + 543}`,
        from: `${y}-${pad(m)}-01`,
        to: `${y}-${pad(m)}-${pad(lastDay)}`,
        kind: "month",
      });
    }
  }
  const years: Period[] = [];
  for (let y = year; y >= year - yearsBack; y -= 1) {
    years.push({ id: String(y), label: `ทั้งปี ${y + 543}`, from: `${y}-01-01`, to: `${y}-12-31`, kind: "year" });
  }
  return [...months, ...years];
}
