// อายุงานคิดจากวันที่ตามปฏิทินไทย (YYYY-MM-DD) ทั้งสองฝั่ง
// เดิมแต่ละหน้าใช้ getFullYear/getMonth/getDate ตามเขตเวลาของเครื่อง (server เป็น UTC) กับวันเริ่มงานที่สร้างเป็นเที่ยงคืนเวลาไทย
// ทำให้วันที่ของวันเริ่มงานถอยไป 1 วัน และอายุงานคลาด 1 เดือนในวันครบรอบ

const TZ = "Asia/Bangkok";

const bangkokDay = (at: Date) => at.toLocaleDateString("sv-SE", { timeZone: TZ });

/** จำนวนเดือนเต็มจาก from ถึง to (YYYY-MM-DD) */
export function fullMonthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = to.slice(0, 10).split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return months;
}

/** อายุงาน เช่น "8 ปี 7 เดือน" นับถึงวันพ้นสภาพ (YYYY-MM-DD) หรือวันนี้ตามเวลาไทย */
export function tenureOf(hireDate: string | null | undefined, end?: string | Date | null): string {
  if (!hireDate) return "—";
  const to = typeof end === "string" && end ? end : bangkokDay(end instanceof Date ? end : new Date());
  const months = fullMonthsBetween(hireDate, to);
  if (months < 0) return "—";
  if (months < 1) return "ไม่ถึง 1 เดือน";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : ""].filter(Boolean).join(" ");
}
