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

export type RequestStatusOverride = {
  status: RequestStatus;
  note?: string;
  updatedAt?: string;
};

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.some((status) => status === value);
}

function isKnownRequest(requestNumber: string) {
  return initialBenefitRequests.some((request) => request.requestNumber === requestNumber);
}

// รองรับทั้งรูปแบบเดิม (เก็บแค่สถานะเป็น string) และรูปแบบใหม่ที่มีหมายเหตุ/เวลาที่อัปเดต
function toStatusOverride(value: unknown): RequestStatusOverride | null {
  if (isRequestStatus(value)) return { status: value };
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const { status, note, updatedAt } = value as Record<string, unknown>;
  if (!isRequestStatus(status)) return null;
  if (note !== undefined && typeof note !== "string") return null;
  if (updatedAt !== undefined && typeof updatedAt !== "string") return null;
  return { status, note, updatedAt };
}

function formatThaiDateTime(date: Date) {
  const datePart = new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const timePart = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${datePart} ${timePart}`;
}

export function readBenefitRequestStatuses(): Record<string, RequestStatusOverride> {
  const saved = sessionStorage.getItem(statusStorageKey);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("ข้อมูลสถานะคำขอสวัสดิการไม่ถูกต้อง");
  }

  const overrides: Record<string, RequestStatusOverride> = {};
  for (const [requestNumber, value] of Object.entries(parsed)) {
    const override = toStatusOverride(value);
    if (!isKnownRequest(requestNumber) || !override) {
      throw new Error("ข้อมูลสถานะคำขอสวัสดิการไม่ถูกต้อง");
    }
    overrides[requestNumber] = override;
  }
  return overrides;
}

export function saveBenefitRequestStatus(
  requestNumber: string,
  status: RequestStatus,
  note?: string,
): Record<string, RequestStatusOverride> {
  const statuses = readBenefitRequestStatuses();
  const trimmedNote = note?.trim();
  const updatedStatuses: Record<string, RequestStatusOverride> = {
    ...statuses,
    [requestNumber]: {
      status,
      ...(trimmedNote ? { note: trimmedNote } : {}),
      updatedAt: formatThaiDateTime(new Date()),
    },
  };
  sessionStorage.setItem(statusStorageKey, JSON.stringify(updatedStatuses));
  return updatedStatuses;
}

export function applyBenefitRequestStatuses(statuses: Record<string, RequestStatusOverride>): BenefitRequest[] {
  return initialBenefitRequests.map((request) => {
    const override = statuses[request.requestNumber];
    if (!override) return request;

    return {
      ...request,
      status: override.status,
      statusNote: override.note ?? (override.status === "อนุมัติแล้ว" ? "อนุมัติคำขอแล้ว" : request.statusNote),
      updatedAt: override.updatedAt ?? request.updatedAt,
    };
  });
}
