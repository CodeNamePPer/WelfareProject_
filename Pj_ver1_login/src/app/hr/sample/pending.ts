// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql
// คำขออ้างอิงรหัสพนักงานจริง (employee.employee_code) หน้า /hr/home จึงดึงสถานะ แผนก และหัวหน้าจริงมาแสดง

/** ค่าที่พนักงานขอแก้ (คำขอแก้ไขข้อมูล) */
export type FieldChange = { field: string; before: string; after: string };

/** เอกสารแนบของคำขอเบิก */
export type Attachment = { name: string; size: string };

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
  /** คำขอแก้ไขข้อมูล: ค่าเดิม → ค่าใหม่ */
  changes?: FieldChange[];
  /** คำขอเบิก: ใบเสร็จ/เอกสารประกอบ */
  attachments?: Attachment[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** วันที่ย้อนหลัง n วันจากวันนี้ (เวลาไทย) ให้คิวตัวอย่างดูเหมือนคิวจริงทุกวันที่เปิด */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

export const pendingRequests: PendingRequest[] = [
  {
    id: "REQ-7012", itemType: "benefit", employeeCode: "E00015", fallbackName: "นายภูมิพัฒน์ จันทร์เพ็ญ", benefit: "ทันตกรรม",
    used: 7500, limit: 15000, amount: 900, submitted: daysAgo(0),
    attachments: [{ name: "ใบเสร็จคลินิกทันตกรรม.pdf", size: "212 KB" }],
  },
  {
    id: "REQ-7011", itemType: "benefit", employeeCode: "E00013", fallbackName: "นางสาวณัฐธิดา บุญมา", benefit: "ค่ารักษาพยาบาล",
    used: 12000, limit: 30000, amount: 2000, submitted: daysAgo(1),
    attachments: [{ name: "ใบเสร็จโรงพยาบาล.pdf", size: "340 KB" }, { name: "ใบรับรองแพทย์.jpg", size: "1.2 MB" }],
  },
  {
    id: "REQ-7010", itemType: "benefit", employeeCode: "E00016", fallbackName: "นางสาวศิริพร มีสุข", benefit: "ฟิตเนสรายปี",
    used: 7000, limit: 10000, amount: 5000, submitted: daysAgo(2),
    attachments: [{ name: "สัญญาสมาชิกฟิตเนส.pdf", size: "480 KB" }],
  },
  {
    id: "REQ-7009", itemType: "benefit", employeeCode: "E00011", fallbackName: "นางสาวกมลวรรณ แก้วมณี", benefit: "ตรวจสุขภาพประจำปี",
    used: 0, limit: 8000, amount: 3500, submitted: daysAgo(3),
    attachments: [{ name: "ใบเสร็จตรวจสุขภาพ.pdf", size: "198 KB" }],
  },
  {
    id: "REQ-7008", itemType: "benefit", employeeCode: "E00017", fallbackName: "นายชยพล สายทอง", benefit: "ค่าอุปกรณ์ทำงาน",
    used: 2400, limit: 12000, amount: 1800, submitted: daysAgo(6),
    attachments: [],
  },
  {
    id: "REQ-7007", itemType: "edit", employeeCode: "E00010", fallbackName: "นางพิมพ์ชนก วงศ์ไทย", benefit: "แก้ไขข้อมูลส่วนบุคคล",
    used: 0, limit: 0, amount: 0, submitted: daysAgo(1),
    changes: [
      { field: "เบอร์โทรศัพท์", before: "081-234-5678", after: "089-765-4321" },
      { field: "ที่อยู่ปัจจุบัน", before: "12/3 ถ.สุขุมวิท แขวงคลองเตย กรุงเทพฯ", after: "45/6 ถ.พหลโยธิน แขวงสามเสนใน กรุงเทพฯ" },
    ],
    attachments: [{ name: "สำเนาทะเบียนบ้าน.pdf", size: "520 KB" }],
  },
  {
    id: "REQ-7006", itemType: "edit", employeeCode: "E00014", fallbackName: "นายอนุชา ประเสริฐศรี", benefit: "แก้ไขข้อมูลบัญชีธนาคาร",
    used: 0, limit: 0, amount: 0, submitted: daysAgo(4),
    changes: [
      { field: "ธนาคาร", before: "กสิกรไทย", after: "ไทยพาณิชย์" },
      { field: "เลขที่บัญชี", before: "123-4-56789-0", after: "987-6-54321-0" },
      { field: "ชื่อบัญชี", before: "อนุชา ประเสริฐศรี", after: "อนุชา ประเสริฐศรี" },
    ],
    attachments: [{ name: "สำเนาหน้าสมุดบัญชี.jpg", size: "860 KB" }],
  },
];
