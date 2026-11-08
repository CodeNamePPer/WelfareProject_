// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql
// คำขออ้างอิงรหัสพนักงานจริง (employee.employee_code) หน้า /hr/home จึงดึงสถานะ แผนก และหัวหน้าจริงมาแสดง

export type PendingRequest = {
  id: string;
  itemType: "benefit" | "edit";
  employeeCode: string;
  /** ชื่อสำรองเมื่อหาพนักงานรหัสนี้ในฐานข้อมูลไม่เจอ */
  fallbackName: string;
  benefit: string;
  used: number;
  limit: number;
  amount: number;
  /** วันที่ยื่น "YYYY-MM-DD" */
  submitted: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** วันที่ย้อนหลัง n วันจากวันนี้ (เวลาไทย) ให้คิวตัวอย่างดูเหมือนคิวจริงทุกวันที่เปิด */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

export const pendingRequests: PendingRequest[] = [
  { id: "REQ-7012", itemType: "benefit", employeeCode: "E00015", fallbackName: "นายภูมิพัฒน์ จันทร์เพ็ญ", benefit: "ทันตกรรม", used: 7500, limit: 15000, amount: 900, submitted: daysAgo(0) },
  { id: "REQ-7011", itemType: "benefit", employeeCode: "E00013", fallbackName: "นางสาวณัฐธิดา บุญมา", benefit: "ค่ารักษาพยาบาล", used: 12000, limit: 30000, amount: 2000, submitted: daysAgo(1) },
  { id: "REQ-7010", itemType: "benefit", employeeCode: "E00016", fallbackName: "นางสาวศิริพร มีสุข", benefit: "ฟิตเนสรายปี", used: 7000, limit: 10000, amount: 5000, submitted: daysAgo(2) },
  { id: "REQ-7009", itemType: "benefit", employeeCode: "E00011", fallbackName: "นางสาวกมลวรรณ แก้วมณี", benefit: "ตรวจสุขภาพประจำปี", used: 0, limit: 8000, amount: 3500, submitted: daysAgo(3) },
  { id: "REQ-7008", itemType: "benefit", employeeCode: "E00017", fallbackName: "นายชยพล สายทอง", benefit: "ค่าอุปกรณ์ทำงาน", used: 2400, limit: 12000, amount: 1800, submitted: daysAgo(6) },
  { id: "REQ-7007", itemType: "edit", employeeCode: "E00010", fallbackName: "นางพิมพ์ชนก วงศ์ไทย", benefit: "แก้ไขข้อมูลส่วนบุคคล", used: 0, limit: 0, amount: 0, submitted: daysAgo(1) },
  { id: "REQ-7006", itemType: "edit", employeeCode: "E00014", fallbackName: "นายอนุชา ประเสริฐศรี", benefit: "แก้ไขข้อมูลบัญชีธนาคาร", used: 0, limit: 0, amount: 0, submitted: daysAgo(4) },
];
