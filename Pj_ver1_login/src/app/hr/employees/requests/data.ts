export type RequestStatus = "รอตรวจสอบ" | "รอแก้ไข" | "อนุมัติแล้ว" | "ปฏิเสธแล้ว";

export type PersonRequest = {
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  personName: string;
  relationship: string;
  dateOfBirth: string;
  phone: string;
  submittedAt: string;
  status: RequestStatus;
  statusNote: string;
  updatedAt: string;
  documents: string[];
};

export const initialPersonRequests: PersonRequest[] = [
  {
    requestNumber: "PER-2026-00128",
    employeeId: "0124",
    employeeName: "นายสมชาย ใจดี",
    department: "IT",
    position: "Developer",
    personName: "นางสาวกมลวรรณ ใจดี",
    relationship: "คู่สมรส",
    dateOfBirth: "15 มี.ค. 2535",
    phone: "08X-XXX-2145",
    submittedAt: "04 พ.ย. 2569 09:14",
    status: "รอแก้ไข",
    statusNote: "กรุณาแนบสำเนาทะเบียนสมรสที่เห็นข้อมูลครบถ้วน",
    updatedAt: "04 พ.ย. 2569 13:20",
    documents: ["สำเนาบัตรประชาชน", "สำเนาทะเบียนสมรส (รอแก้ไข)"],
  },
  {
    requestNumber: "PER-2026-00127",
    employeeId: "0352",
    employeeName: "น.ส.สมหญิง รักดี",
    department: "Marketing",
    position: "Marketing Officer",
    personName: "เด็กชายณัฐวุฒิ รักดี",
    relationship: "บุตร",
    dateOfBirth: "22 ก.ค. 2562",
    phone: "09X-XXX-8831",
    submittedAt: "03 พ.ย. 2569 16:42",
    status: "รอตรวจสอบ",
    statusNote: "เอกสารครบถ้วน อยู่ระหว่างตรวจสอบข้อมูล",
    updatedAt: "03 พ.ย. 2569 16:42",
    documents: ["สูติบัตร", "สำเนาทะเบียนบ้าน"],
  },
  {
    requestNumber: "PER-2026-00126",
    employeeId: "0411",
    employeeName: "นายมานะ มุ่งมั่น",
    department: "Sales",
    position: "Sales Executive",
    personName: "นางอรทัย มุ่งมั่น",
    relationship: "บิดา/มารดา",
    dateOfBirth: "08 ธ.ค. 2503",
    phone: "08X-XXX-6402",
    submittedAt: "02 พ.ย. 2569 11:08",
    status: "อนุมัติแล้ว",
    statusNote: "ตรวจสอบเอกสารและอนุมัติเรียบร้อย",
    updatedAt: "03 พ.ย. 2569 10:16",
    documents: ["สำเนาบัตรประชาชน", "สำเนาทะเบียนบ้าน"],
  },
  {
    requestNumber: "PER-2026-00125",
    employeeId: "0278",
    employeeName: "น.ส.ปวีณา ตั้งใจ",
    department: "HR",
    position: "HR Officer",
    personName: "เด็กหญิงพิมพ์ชนก ตั้งใจ",
    relationship: "บุตร",
    dateOfBirth: "10 ม.ค. 2564",
    phone: "09X-XXX-5107",
    submittedAt: "01 พ.ย. 2569 14:36",
    status: "ปฏิเสธแล้ว",
    statusNote: "ข้อมูลชื่อในแบบคำขอไม่ตรงกับเอกสารสูติบัตร",
    updatedAt: "02 พ.ย. 2569 09:25",
    documents: ["สูติบัตร", "สำเนาทะเบียนบ้าน"],
  },
  {
    requestNumber: "PER-2026-00124",
    employeeId: "0506",
    employeeName: "นายธนกร ก้าวหน้า",
    department: "Finance",
    position: "Accountant",
    personName: "นางสาวธัญญารัตน์ ก้าวหน้า",
    relationship: "คู่สมรส",
    dateOfBirth: "19 ก.ย. 2534",
    phone: "06X-XXX-7724",
    submittedAt: "31 ต.ค. 2569 10:02",
    status: "รอแก้ไข",
    statusNote: "กรุณาแนบสำเนาบัตรประชาชนด้านหลังเพิ่มเติม",
    updatedAt: "01 พ.ย. 2569 15:10",
    documents: ["สำเนาบัตรประชาชน (ไม่ครบถ้วน)", "สำเนาทะเบียนสมรส"],
  },
];

const requestStatuses: RequestStatus[] = ["รอตรวจสอบ", "รอแก้ไข", "อนุมัติแล้ว", "ปฏิเสธแล้ว"];
const statusStorageKey = "person-request-statuses";

function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && requestStatuses.some((status) => status === value);
}

function isStatusOverrides(value: unknown): value is Record<string, RequestStatus> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(([requestNumber, status]) =>
      initialPersonRequests.some((request) => request.requestNumber === requestNumber) &&
      isRequestStatus(status),
    )
  );
}

export function readPersonRequestStatuses(): Record<string, RequestStatus> {
  const saved = sessionStorage.getItem(statusStorageKey);
  if (!saved) return {};

  const parsed: unknown = JSON.parse(saved);
  if (!isStatusOverrides(parsed)) {
    throw new Error("ข้อมูลสถานะคำขอเพิ่มบุคคลไม่ถูกต้อง");
  }
  return parsed;
}

export function savePersonRequestStatus(requestNumber: string, status: RequestStatus): Record<string, RequestStatus> {
  const statuses = readPersonRequestStatuses();
  const updatedStatuses = { ...statuses, [requestNumber]: status };
  sessionStorage.setItem(statusStorageKey, JSON.stringify(updatedStatuses));
  return updatedStatuses;
}

export function applyPersonRequestStatuses(statuses: Record<string, RequestStatus>): PersonRequest[] {
  return initialPersonRequests.map((request) => {
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
