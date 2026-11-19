// รูปแบบข้อความในหน้าโปรไฟล์ (P01/P02) ใช้ทั้งโปรไฟล์ของ HR และ Admin

export const TZ = "Asia/Bangkok";
export const plain = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export { tenureOf } from "@/lib/tenure";

/** วันนี้ 08:52 / 12 พ.ย. 2569 08:47 */
export function loginTime(iso: string) {
  const date = new Date(iso);
  const day = (value: Date) => value.toLocaleDateString("sv-SE", { timeZone: TZ });
  const time = date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  return `${day(date) === day(new Date()) ? "วันนี้" : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: TZ })} ${time}`;
}
