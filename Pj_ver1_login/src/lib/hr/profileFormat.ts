// รูปแบบข้อความในหน้าโปรไฟล์ (P01/P02) ใช้ทั้งโปรไฟล์ของ HR และ Admin

export const TZ = "Asia/Bangkok";
export const plain = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

/** อายุงานจากวันเริ่มงาน เช่น "5 ปี 5 เดือน" */
export function tenureOf(hireDate: string, today = new Date()) {
  const start = new Date(`${hireDate}T00:00:00+07:00`);
  let months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
  if (today.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : "", !years && !rest ? "ไม่ถึง 1 เดือน" : ""].filter(Boolean).join(" ");
}

/** วันนี้ 08:52 / 12 พ.ย. 2569 08:47 */
export function loginTime(iso: string) {
  const date = new Date(iso);
  const day = (value: Date) => value.toLocaleDateString("sv-SE", { timeZone: TZ });
  const time = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  return `${day(date) === day(new Date()) ? "วันนี้" : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: TZ })} ${time}`;
}
