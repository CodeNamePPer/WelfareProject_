export type RequestStatus = "รอตรวจสอบ" | "รอแก้ไข" | "อนุมัติแล้ว" | "ปฏิเสธแล้ว";

export type EmployeeRequest = {
  requestNumber: string;
  employeeName: string;
  department: string;
  position: string;
  submittedAt: string;
  status: RequestStatus;
  statusNote: string;
  updatedAt: string;
  documents: string[];
};

export const initialEmployeeRequests: EmployeeRequest[] = [
  {
    requestNumber: "EMP-2026-00128",
    employeeName: "นายกิตติพงษ์ วัฒนชัย",
    department: "IT",
    position: "Developer",
    submittedAt: "04 พ.ย. 2569 09:14",
    status: "รอตรวจสอบ",
    statusNote: "เอกสารครบถ้วน อยู่ระหว่างตรวจสอบข้อมูล",
    updatedAt: "04 พ.ย. 2569 09:14",
    documents: ["ใบสมัครงาน", "สำเนาบัตรประชาชน", "ประวัติการทำงาน"],
  },
  {
    requestNumber: "EMP-2026-00127",
    employeeName: "นางสาวณัฐชา พิพัฒน์กุล",
    department: "Marketing",
    position: "Marketing Officer",
    submittedAt: "03 พ.ย. 2569 16:42",
    status: "รอตรวจสอบ",
    statusNote: "เอกสารครบถ้วน อยู่ระหว่างตรวจสอบข้อมูล",
    updatedAt: "03 พ.ย. 2569 16:42",
    documents: ["ใบสมัครงาน", "สำเนาบัตรประชาชน", "วุฒิการศึกษา"],
  },
  {
    requestNumber: "EMP-2026-00126",
    employeeName: "นายภาคภูมิ ศรีสุข",
    department: "Sales",
    position: "Sales Executive",
    submittedAt: "02 พ.ย. 2569 11:08",
    status: "อนุมัติแล้ว",
    statusNote: "ตรวจสอบเอกสารและอนุมัติเรียบร้อย",
    updatedAt: "03 พ.ย. 2569 10:16",
    documents: ["ใบสมัครงาน", "สำเนาบัตรประชาชน", "ประวัติการทำงาน"],
  },
  {
    requestNumber: "EMP-2026-00125",
    employeeName: "นางสาวปาริชาติ อินทร์แก้ว",
    department: "HR",
    position: "HR Officer",
    submittedAt: "01 พ.ย. 2569 14:36",
    status: "ปฏิเสธแล้ว",
    statusNote: "คุณสมบัติไม่ตรงตามเงื่อนไขของตำแหน่ง",
    updatedAt: "02 พ.ย. 2569 09:25",
    documents: ["ใบสมัครงาน", "วุฒิการศึกษา"],
  },
  {
    requestNumber: "EMP-2026-00124",
    employeeName: "นายณัฐวุฒิ เกียรติไพศาล",
    department: "Finance",
    position: "Accountant",
    submittedAt: "31 ต.ค. 2569 10:02",
    status: "รอแก้ไข",
    statusNote: "กรุณาแนบสำเนาวุฒิการศึกษาเพิ่มเติม",
    updatedAt: "01 พ.ย. 2569 15:10",
    documents: ["ใบสมัครงาน", "สำเนาบัตรประชาชน"],
  },
];

const requestStatuses: RequestStatus[] = ["รอตรวจสอบ", "รอแก้ไข", "อนุมัติแล้ว", "ปฏิเสธแล้ว"];
const statusStorageKey = "employee-request-statuses";

export type RequestStatusOverride = {
  status: RequestStatus;
  note?: string;
  updatedAt?: string;
};

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.some((status) => status === value);
}

function isKnownRequest(requestNumber: string) {
  return initialEmployeeRequests.some((request) => request.requestNumber === requestNumber);
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

export function readEmployeeRequestStatuses(): Record<string, RequestStatusOverride> {
  const saved = sessionStorage.getItem(statusStorageKey);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("ข้อมูลสถานะคำขอเพิ่มพนักงานไม่ถูกต้อง");
  }

  const overrides: Record<string, RequestStatusOverride> = {};
  for (const [requestNumber, value] of Object.entries(parsed)) {
    const override = toStatusOverride(value);
    if (!isKnownRequest(requestNumber) || !override) {
      throw new Error("ข้อมูลสถานะคำขอเพิ่มพนักงานไม่ถูกต้อง");
    }
    overrides[requestNumber] = override;
  }
  return overrides;
}

export function saveEmployeeRequestStatus(
  requestNumber: string,
  status: RequestStatus,
  note?: string,
): Record<string, RequestStatusOverride> {
  const statuses = readEmployeeRequestStatuses();
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

export function applyEmployeeRequestStatuses(statuses: Record<string, RequestStatusOverride>): EmployeeRequest[] {
  return initialEmployeeRequests.map((request) => {
    const override = statuses[request.requestNumber];
    if (!override) return request;

    return {
      ...request,
      status: override.status,
      statusNote: override.note ?? (override.status === "อนุมัติแล้ว" ? "ตรวจสอบเอกสารและอนุมัติเรียบร้อย" : request.statusNote),
      updatedAt: override.updatedAt ?? request.updatedAt,
    };
  });
}
