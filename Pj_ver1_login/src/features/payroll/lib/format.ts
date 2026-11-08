// ฟังก์ชันจัดรูปแบบข้อมูลสำหรับแสดงผล (Style Guide ข้อ 2 "การแสดงผลข้อมูล")
// วันที่ทั้งระบบเก็บเป็นข้อความ ISO "YYYY-MM-DD" (ปี ค.ศ.) แล้วค่อยแปลงเป็นแบบไทยตอนแสดง

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** ค.ศ. -> พ.ศ.  เช่น 2026 -> 2569 */
export function toBuddhistYear(year: number): number {
  return year + 543;
}

/** แยก "2026-10-27" เป็นตัวเลข {year, month (1-12), day} โดยไม่ผ่าน Date เพื่อไม่ให้เพี้ยนตาม timezone */
export function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "2026-10-27" -> "27 ต.ค. 2569" */
export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const { year, month, day } = parseISODate(iso);
  return `${day} ${THAI_MONTHS_SHORT[month - 1]} ${toBuddhistYear(year)}`;
}

/** (2026, 10) -> "ตุลาคม 2569" */
export function formatThaiMonthYear(year: number, month: number): string {
  return `${THAI_MONTHS_FULL[month - 1]} ${toBuddhistYear(year)}`;
}

const bahtFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const bahtFormatterInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 12500 -> "฿12,500.00"  (ใส่ decimals: false เพื่อไม่แสดงทศนิยม) */
export function formatBaht(amount: number, decimals = true): string {
  return `฿${(decimals ? bahtFormatter : bahtFormatterInt).format(amount)}`;
}

/** ตัวเลขทั่วไปมีจุลภาค เช่น 1200 -> "1,200" */
export function formatNumber(n: number): string {
  return bahtFormatterInt.format(n);
}
