export type RequestStatus = "รออนุมัติ" | "อนุมัติแล้ว" | "ปฏิเสธแล้ว" | "รอแก้ไข";

export type BenefitRequest = {
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  benefitType: string;
  amount: number;
  details: string;
  submittedAt: string;
  updatedAt: string;
  status: RequestStatus;
  statusNote: string;
  documents: string[];
};

export const initialBenefitRequests: BenefitRequest[] = [
  {
    requestNumber: "WF-2569-014",
    employeeId: "0124",
    employeeName: "นายสมชาย ใจดี",
    department: "IT",
    position: "Developer",
    benefitType: "ค่ารักษาพยาบาล",
    amount: 10000,
    details: "ขอเพิ่มสิทธิ์ค่ารักษาพยาบาลสำหรับปี 2569 พร้อมปรับวงเงินตามระดับตำแหน่ง",
    submittedAt: "04 พ.ย. 2569 09:14",
    updatedAt: "04 พ.ย. 2569 09:14",
    status: "รออนุมัติ",
    statusNote: "คำขอใหม่ รอผู้ดูแลตรวจสอบ",
    documents: ["ใบเสนอแผนประกันกลุ่ม", "ตารางวงเงินค่ารักษาพยาบาล"],
  },
  {
    requestNumber: "WF-2569-011",
    employeeId: "0352",
    employeeName: "น.ส.สมหญิง รักดี",
    department: "Marketing",
    position: "Marketing Officer",
    benefitType: "ค่าทันตกรรม",
    amount: 12000,
    details: "ขอปรับวงเงินทันตกรรมประจำปีจาก 3,000 บาท เป็น 12,000 บาทต่อคน",
    submittedAt: "03 พ.ย. 2569 16:42",
    updatedAt: "04 พ.ย. 2569 10:30",
    status: "รออนุมัติ",
    statusNote: "อยู่ระหว่างตรวจสอบงบประมาณประจำปี",
    documents: ["ใบเสนอราคาคลินิกคู่สัญญา", "ประมาณการผู้ใช้สิทธิ์"],
  },
  {
    requestNumber: "WF-2569-006",
    employeeId: "0411",
    employeeName: "นายมานะ มุ่งมั่น",
    department: "Sales",
    position: "Sales Executive",
    benefitType: "ค่ารักษาพยาบาล",
    amount: 15000,
    details: "ขอเพิ่มวงเงินผู้ป่วยนอกและขยายรายชื่อโรงพยาบาลคู่สัญญาในภาคตะวันออก",
    submittedAt: "02 พ.ย. 2569 11:08",
    updatedAt: "03 พ.ย. 2569 10:16",
    status: "อนุมัติแล้ว",
    statusNote: "อนุมัติวงเงินและรายชื่อโรงพยาบาลตามเอกสารแนบ",
    documents: ["รายละเอียดแผนความคุ้มครอง", "รายชื่อโรงพยาบาลคู่สัญญา"],
  },
  {
    requestNumber: "WF-2569-004",
    employeeId: "0278",
    employeeName: "น.ส.ปวีณา ตั้งใจ",
    department: "HR",
    position: "HR Officer",
    benefitType: "พัฒนาตัวเอง/เรียน",
    amount: 8000,
    details: "เสนอเพิ่มงบสนับสนุนหลักสูตรอบรมวิชาชีพที่เกี่ยวข้องกับตำแหน่งงาน",
    submittedAt: "01 พ.ย. 2569 14:36",
    updatedAt: "02 พ.ย. 2569 09:25",
    status: "รอแก้ไข",
    statusNote: "กรุณาแนบรายละเอียดหลักสูตรและเงื่อนไขการเบิกให้ครบถ้วน",
    documents: ["แบบเสนอปรับปรุงสวัสดิการ"],
  },
  {
    requestNumber: "WF-2569-002",
    employeeId: "0506",
    employeeName: "นายธนกร ก้าวหน้า",
    department: "Finance",
    position: "Accountant",
    benefitType: "ค่าอุปกรณ์ทำงาน",
    amount: 6000,
    details: "ขอเพิ่มสิทธิ์เบิกอุปกรณ์ทำงานสำหรับพนักงานที่ทำงานแบบ Hybrid",
    submittedAt: "31 ต.ค. 2569 10:02",
    updatedAt: "01 พ.ย. 2569 15:10",
    status: "ปฏิเสธแล้ว",
    statusNote: "งบประมาณปีปัจจุบันได้รับการจัดสรรเต็มจำนวนแล้ว",
    documents: ["รายการอุปกรณ์และราคา", "เหตุผลประกอบคำขอ"],
  },
];

const requestStatuses: RequestStatus[] = ["รออนุมัติ", "อนุมัติแล้ว", "ปฏิเสธแล้ว", "รอแก้ไข"];
const statusStorageKey = "benefit-request-statuses";

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.some((status) => status === value);
}

function isStatusOverrides(value: unknown): value is Record<string, RequestStatus> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(([requestNumber, status]) =>
      initialBenefitRequests.some((request) => request.requestNumber === requestNumber) &&
      isRequestStatus(status),
    )
  );
}

export function readBenefitRequestStatuses(): Record<string, RequestStatus> {
  const saved = sessionStorage.getItem(statusStorageKey);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (!isStatusOverrides(parsed)) {
    throw new Error("ข้อมูลสถานะคำขอสวัสดิการไม่ถูกต้อง");
  }
  return parsed;
}

export function saveBenefitRequestStatus(requestNumber: string, status: RequestStatus): Record<string, RequestStatus> {
  const statuses = readBenefitRequestStatuses();
  const updatedStatuses = { ...statuses, [requestNumber]: status };
  sessionStorage.setItem(statusStorageKey, JSON.stringify(updatedStatuses));
  return updatedStatuses;
}

export function applyBenefitRequestStatuses(statuses: Record<string, RequestStatus>): BenefitRequest[] {
  return initialBenefitRequests.map((request) => {
    const status = statuses[request.requestNumber];
    return status
      ? { ...request, status, statusNote: status === "อนุมัติแล้ว" ? "อนุมัติคำขอแล้ว" : request.statusNote }
      : request;
  });
}
