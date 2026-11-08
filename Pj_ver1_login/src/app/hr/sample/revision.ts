// ข้อมูลตัวอย่าง: ยังไม่มีตารางคำขอเบิก (claims) ในฐานข้อมูล
// ดู supabase/migrations/20261104090000_welfare_benefits.sql

export type RevisionRequest = {
  requestId: string;
  itemType: "benefit" | "edit";
  employeeId: string;
  name: string;
  department: string;
  position: string;
  benefit: string;
  amount: number;
  correction: string;
  submittedAt: string;
};

const employees = [
  { id: "E00015", name: "นายสมชาย ใจดี", department: "IT", position: "Developer" },
  { id: "E00013", name: "น.ส.สมหญิง รักดี", department: "Marketing", position: "Marketing Officer" },
  { id: "E00016", name: "นายมานะ มุ่งมั่น", department: "Sales", position: "Sales Executive" },
  { id: "E00011", name: "น.ส.ปวีณา ตั้งใจ", department: "HR", position: "HR Officer" },
  { id: "E00012", name: "นายธนกร ก้าวหน้า", department: "Finance", position: "Accountant" },
];

const benefits = ["ทันตกรรม", "ค่ารักษาพยาบาล", "ฟิตเนสรายปี", "ตรวจสุขภาพประจำปี", "ค่าอุปกรณ์ทำงาน"];
const correctionNotes = [
  "กรุณาแนบใบเสร็จฉบับเต็ม",
  "กรุณาแก้ไขวันที่ในเอกสาร",
  "ขอเอกสารรับรองเพิ่มเติม",
  "กรุณาระบุรายละเอียดค่าใช้จ่าย",
  "เอกสารแนบอ่านข้อมูลไม่ชัดเจน",
];

export const revisionRequests: RevisionRequest[] = [...Array.from({ length: 123 }, (_, index) => {
  const employeeIndex = index % employees.length;
  const employee = employees[employeeIndex];
  return {
    // แต่ละสถานะใช้ช่วงเลขของตัวเอง เลขที่คำขอจึงไม่ซ้ำกันข้ามรายการ (รอแก้ไข 4xxx, อนุมัติ 5xxx, ปฏิเสธ 69xx)
    requestId: `REQ-${String(4001 + index).padStart(4, "0")}`,
    itemType: "benefit" as const,
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    position: employee.position,
    benefit: benefits[employeeIndex],
    amount: [900, 2000, 5000, 3500, 1800][employeeIndex] + Math.floor(index / employees.length) * 100,
    correction: correctionNotes[index % correctionNotes.length],
    submittedAt: `${12 - Math.floor(index / 20)} ต.ค. 2569`,
  };
}), {
  requestId: "REQ-EDIT-6701",
  itemType: "edit",
  employeeId: "E00010",
  name: "น.ส.สุภาวดี รุ่งเรือง",
  department: "HR",
  position: "HR Officer",
  benefit: "แก้ไขข้อมูลส่วนบุคคล",
  amount: 0,
  correction: "กรุณาแนบเอกสารยืนยันข้อมูลที่แก้ไข",
  submittedAt: "12 ต.ค. 2569",
}, {
  requestId: "REQ-EDIT-6702",
  itemType: "edit",
  employeeId: "E00014",
  name: "นายธีรภัทร พัฒนกิจ",
  department: "IT",
  position: "Developer",
  benefit: "แก้ไขข้อมูลบัญชีธนาคาร",
  amount: 0,
  correction: "กรุณาแนบสำเนาหน้าสมุดบัญชี",
  submittedAt: "11 ต.ค. 2569",
}];
