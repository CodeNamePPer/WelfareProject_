// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql

export type RejectedRequest = {
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
  reason: string;
  rejectedAt: string;
};

const employees = [
  { id: "E00015", name: "นายสมชาย ใจดี", department: "IT", position: "Developer" },
  { id: "E00013", name: "น.ส.สมหญิง รักดี", department: "Marketing", position: "Marketing Officer" },
  { id: "E00016", name: "นายมานะ มุ่งมั่น", department: "Sales", position: "Sales Executive" },
  { id: "E00011", name: "น.ส.ปวีณา ตั้งใจ", department: "HR", position: "HR Officer" },
  { id: "E00012", name: "นายธนกร ก้าวหน้า", department: "Finance", position: "Accountant" },
];

export const rejectedRequests: RejectedRequest[] = [...Array.from({ length: 20 }, (_, index) => {
  const employee = employees[index % employees.length];
  const benefits = ["ทันตกรรม", "ค่ารักษาพยาบาล", "ฟิตเนสรายปี", "ตรวจสุขภาพประจำปี", "ค่าอุปกรณ์ทำงาน"];
  const reasons = [
    "เอกสารประกอบไม่ครบถ้วน",
    "เกินวงเงินสิทธิประจำปี",
    "เอกสารไม่ตรงตามเงื่อนไขสวัสดิการ",
    "รายการเบิกไม่เข้าเงื่อนไข",
  ];
  return {
    requestId: `REQ-${String(6901 + index).padStart(4, "0")}`,
    itemType: "benefit" as const,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    benefit: benefits[index % benefits.length],
    used: [7500, 12000, 2000, 0, 2400][index % employees.length],
    limit: [15000, 30000, 10000, 8000, 12000][index % employees.length],
    amount: [900, 2000, 5000, 3500, 1800][index % employees.length] + Math.floor(index / employees.length) * 250,
    reason: reasons[index % reasons.length],
    rejectedAt: `${12 - Math.floor(index / 4)} ต.ค. 2569`,
  };
}), {
  requestId: "REQ-EDIT-6901",
  itemType: "edit",
  employeeId: "E00010",
  name: "น.ส.สุภาวดี รุ่งเรือง",
  department: "HR",
  position: "HR Officer",
  benefit: "แก้ไขข้อมูลส่วนบุคคล",
  used: 0,
  limit: 0,
  amount: 0,
  reason: "เอกสารยืนยันข้อมูลไม่ครบถ้วน",
  rejectedAt: "10 ต.ค. 2569",
}, {
  requestId: "REQ-EDIT-6902",
  itemType: "edit",
  employeeId: "E00014",
  name: "นายธีรภัทร พัฒนกิจ",
  department: "IT",
  position: "Developer",
  benefit: "แก้ไขข้อมูลบัญชีธนาคาร",
  used: 0,
  limit: 0,
  amount: 0,
  reason: "กรุณาแนบสำเนาหน้าสมุดบัญชี",
  rejectedAt: "09 ต.ค. 2569",
}];
