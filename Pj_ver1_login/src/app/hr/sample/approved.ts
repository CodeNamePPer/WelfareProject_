// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql

export type ApprovedRequest = {
  requestId: string;
  itemType: "benefit" | "edit";
  employeeId: string;
  name: string;
  department: string;
  position: string;
  benefit: string;
  used: number;
  limit: number;
  amount: number;
  approvedAt: string;
};

export const employees = [
  { id: "0124", name: "นายสมชาย ใจดี", department: "IT", position: "Developer" },
  { id: "0352", name: "น.ส.สมหญิง รักดี", department: "Marketing", position: "Marketing Officer" },
  { id: "0411", name: "นายมานะ มุ่งมั่น", department: "Sales", position: "Sales Executive" },
  { id: "0278", name: "น.ส.ปวีณา ตั้งใจ", department: "HR", position: "HR Officer" },
  { id: "0506", name: "นายธนกร ก้าวหน้า", department: "Finance", position: "Accountant" },
];

export const benefits = ["ทันตกรรม", "ค่ารักษาพยาบาล", "ฟิตเนสรายปี", "ตรวจสุขภาพประจำปี", "ค่าอุปกรณ์ทำงาน"];
const quotas = [
  { used: 7500, limit: 15000, amount: 900 },
  { used: 12000, limit: 30000, amount: 2000 },
  { used: 2000, limit: 10000, amount: 5000 },
  { used: 0, limit: 8000, amount: 3500 },
  { used: 2400, limit: 12000, amount: 1800 },
];

export const approvedRequests: ApprovedRequest[] = [...Array.from({ length: 142 }, (_, index) => {
  const employeeIndex = index % employees.length;
  const employee = employees[employeeIndex];
  const quota = quotas[employeeIndex];
  return {
    requestId: `REQ-${String(6801 + index).padStart(4, "0")}`,
    itemType: "benefit" as const,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    benefit: benefits[employeeIndex],
    used: quota.used,
    limit: quota.limit,
    amount: quota.amount + Math.floor(index / employees.length) * 100,
    approvedAt: `${12 - Math.floor(index / 20)} ต.ค. 2569`,
  };
}), {
  requestId: "REQ-EDIT-6801",
  itemType: "edit",
  employeeId: "0624",
  name: "น.ส.สุภาวดี รุ่งเรือง",
  department: "HR",
  position: "HR Officer",
  benefit: "แก้ไขข้อมูลส่วนบุคคล",
  used: 0,
  limit: 0,
  amount: 0,
  approvedAt: "12 ต.ค. 2569",
}, {
  requestId: "REQ-EDIT-6802",
  itemType: "edit",
  employeeId: "0718",
  name: "นายธีรภัทร พัฒนกิจ",
  department: "IT",
  position: "Developer",
  benefit: "แก้ไขข้อมูลบัญชีธนาคาร",
  used: 0,
  limit: 0,
  amount: 0,
  approvedAt: "11 ต.ค. 2569",
}];
