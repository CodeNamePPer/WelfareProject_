// ตัวช่วยแปลงข้อมูลตัวอย่างของคำขอที่ดำเนินการแล้วให้อยู่ในรูปที่ StatusList ใช้

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "12 ต.ค. 2569" -> "2026-10-12" (เก็บเป็น ISO เพื่อเรียงลำดับได้ แล้วค่อยจัดรูปแบบตอนแสดง) */
export function thaiShortDateToIso(value: string): string {
  const [day, month, year] = value.trim().split(/\s+/);
  const monthIndex = THAI_MONTHS.indexOf(month);
  if (monthIndex < 0 || !day || !year) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Number(year) - 543}-${pad(monthIndex + 1)}-${pad(Number(day))}`;
}

/** เจ้าหน้าที่ HR ที่ดำเนินการ (ตัวอย่าง: สลับกันระหว่างผู้จัดการฝ่ายบุคคลกับเจ้าหน้าที่บุคคล) */
const HR_ACTORS = ["E00010", "E00011"];

export function sampleActor(index: number): string {
  return HR_ACTORS[index % HR_ACTORS.length];
}
