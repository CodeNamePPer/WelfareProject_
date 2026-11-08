// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql

export type PendingRequest = {
  id: string;
  itemType: "benefit" | "edit";
  name: string;
  department: string;
  position: string;
  benefit: string;
  used: number;
  limit: number;
  amount: number;
  submitted: string;
};

export const pendingRequests: PendingRequest[] = [
  { id: "0124", itemType: "benefit", name: "นายสมชาย ใจดี", department: "IT", position: "Developer", benefit: "ทันตกรรม", used: 7500, limit: 15000, amount: 900, submitted: "12 ต.ค. 2569" },
  { id: "0352", itemType: "benefit", name: "น.ส.สมหญิง รักดี", department: "Marketing", position: "Marketing Officer", benefit: "ค่ารักษาพยาบาล", used: 12000, limit: 30000, amount: 2000, submitted: "12 ต.ค. 2569" },
  { id: "0411", itemType: "benefit", name: "นายมานะ มุ่งมั่น", department: "Sales", position: "Sales Executive", benefit: "ฟิตเนสรายปี", used: 2000, limit: 10000, amount: 5000, submitted: "11 ต.ค. 2569" },
  { id: "0278", itemType: "benefit", name: "น.ส.ปวีณา ตั้งใจ", department: "HR", position: "HR Officer", benefit: "ตรวจสุขภาพประจำปี", used: 0, limit: 8000, amount: 3500, submitted: "11 ต.ค. 2569" },
  { id: "0506", itemType: "benefit", name: "นายธนกร ก้าวหน้า", department: "Finance", position: "Accountant", benefit: "ค่าอุปกรณ์ทำงาน", used: 2400, limit: 12000, amount: 1800, submitted: "10 ต.ค. 2569" },
  { id: "0624", itemType: "edit", name: "น.ส.สุภาวดี รุ่งเรือง", department: "HR", position: "HR Officer", benefit: "แก้ไขข้อมูลส่วนบุคคล", used: 0, limit: 0, amount: 0, submitted: "12 ต.ค. 2569" },
  { id: "0718", itemType: "edit", name: "นายธีรภัทร พัฒนกิจ", department: "IT", position: "Developer", benefit: "แก้ไขข้อมูลบัญชีธนาคาร", used: 0, limit: 0, amount: 0, submitted: "11 ต.ค. 2569" },
];
