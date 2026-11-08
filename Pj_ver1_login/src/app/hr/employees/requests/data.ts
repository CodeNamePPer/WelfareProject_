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

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.some((status) => status === value);
}

function isStatusOverrides(value: unknown): value is Record<string, RequestStatus> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(([requestNumber, status]) =>
      initialEmployeeRequests.some((request) => request.requestNumber === requestNumber) &&
      isRequestStatus(status),
    )
  );
}

export function readEmployeeRequestStatuses(): Record<string, RequestStatus> {
  const saved = sessionStorage.getItem(statusStorageKey);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (!isStatusOverrides(parsed)) {
    throw new Error("ข้อมูลสถานะคำขอเพิ่มพนักงานไม่ถูกต้อง");
  }
  return parsed;
}

export function saveEmployeeRequestStatus(requestNumber: string, status: RequestStatus): Record<string, RequestStatus> {
  const statuses = readEmployeeRequestStatuses();
  const updatedStatuses = { ...statuses, [requestNumber]: status };
  sessionStorage.setItem(statusStorageKey, JSON.stringify(updatedStatuses));
  return updatedStatuses;
}

export function applyEmployeeRequestStatuses(statuses: Record<string, RequestStatus>): EmployeeRequest[] {
  return initialEmployeeRequests.map((request) => {
    const status = statuses[request.requestNumber];
    return status
      ? {
          ...request,
          status,
          statusNote: status === "อนุมัติแล้ว" ? "ตรวจสอบเอกสารและอนุมัติเรียบร้อย" : request.statusNote,
        }
      : request;
  });
}
