import { parseCsv } from "@/features/finance/csv";
import type { OrgOption, OrgOptions } from "@/lib/auth/users";

export const MAX_CSV_IMPORT_ROWS = 200;
export const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export const EMPLOYEE_CSV_PREFIXES = ["นาย", "นาง", "นางสาว"] as const;
export const EMPLOYEE_CSV_GENDERS = ["ชาย", "หญิง", "ไม่ระบุ"] as const;
export const EMPLOYEE_CSV_MARITAL_STATUSES = ["โสด", "สมรส", "หย่าร้าง / หม้าย"] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CITIZEN_ID_RE = /^\d{13}$/;
const POSTAL_CODE_RE = /^\d{5}$/;
const MANAGER_CODE_RE = /^E\d{5}$/i;
const MANAGER_PAREN_RE = /\((E\d{5})\)\s*$/i;

export interface EmployeeCsvRowInput {
  rowNumber: number;
  prefix: string;
  firstName: string;
  lastName: string;
  firstNameEn: string;
  lastNameEn: string;
  nickname: string;
  gender: string;
  birthDate: string;
  citizenId: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  childrenCount: string;
  startDate: string;
  department: string;
  position: string;
  jobLevel: string;
  managerCode: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  currentAddress: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  fatherFirstName: string;
  fatherLastName: string;
  motherFirstName: string;
  motherLastName: string;
}

export type EmployeeCsvFieldKey = Exclude<keyof EmployeeCsvRowInput, "rowNumber">;

export interface EmployeeCsvColumnSpec {
  key: EmployeeCsvFieldKey;
  header: string;
  required: boolean;
  aliases: string[];
  ruleSummary: string;
}

export const EMPLOYEE_CSV_COLUMNS: EmployeeCsvColumnSpec[] = [
  {
    key: "prefix",
    header: "คำนำหน้า",
    required: false,
    aliases: ["prefix", "title_th", "titleTh", "คำนำหน้าชื่อ"],
    ruleSummary: "นาย, นาง, นางสาว, อื่น ๆ หรือเว้นว่าง",
  },
  {
    key: "firstName",
    header: "ชื่อ",
    required: true,
    aliases: ["ชื่อ (ไทย)", "firstName", "first_name_th", "firstNameTh"],
    ruleSummary: "ชื่อจริงภาษาไทย (ห้ามว่าง)",
  },
  {
    key: "lastName",
    header: "นามสกุล",
    required: true,
    aliases: ["นามสกุล (ไทย)", "lastName", "last_name_th", "lastNameTh"],
    ruleSummary: "นามสกุลภาษาไทย (ห้ามว่าง)",
  },
  {
    key: "firstNameEn",
    header: "ชื่อ (อังกฤษ)",
    required: false,
    aliases: ["ชื่ออังกฤษ", "firstNameEn", "first_name_en"],
    ruleSummary: "ชื่อภาษาอังกฤษ (เว้นว่างได้)",
  },
  {
    key: "lastNameEn",
    header: "นามสกุล (อังกฤษ)",
    required: false,
    aliases: ["นามสกุลอังกฤษ", "lastNameEn", "last_name_en"],
    ruleSummary: "นามสกุลภาษาอังกฤษ (เว้นว่างได้)",
  },
  {
    key: "nickname",
    header: "ชื่อเล่น",
    required: false,
    aliases: ["nickname"],
    ruleSummary: "ชื่อเล่น (เว้นว่างได้)",
  },
  {
    key: "gender",
    header: "เพศ",
    required: true,
    aliases: ["gender"],
    ruleSummary: "ชาย, หญิง หรือ ไม่ระบุ",
  },
  {
    key: "birthDate",
    header: "วันเกิด",
    required: true,
    aliases: ["birthDate", "birth_date"],
    ruleSummary: "YYYY-MM-DD (ค.ศ.) ต้องไม่เกินวันนี้ และอยู่ก่อนวันเริ่มงาน",
  },
  {
    key: "citizenId",
    header: "เลขบัตรประชาชน",
    required: true,
    aliases: ["citizenId", "citizen_id"],
    ruleSummary: "ตัวเลข 13 หลัก ห้ามซ้ำในไฟล์และในระบบ (ใส่หรือไม่ใส่ขีดก็ได้)",
  },
  {
    key: "nationality",
    header: "สัญชาติ",
    required: true,
    aliases: ["nationality"],
    ruleSummary: "เช่น ไทย (ห้ามว่าง)",
  },
  {
    key: "religion",
    header: "ศาสนา",
    required: false,
    aliases: ["religion"],
    ruleSummary: "ศาสนา (เว้นว่างได้)",
  },
  {
    key: "maritalStatus",
    header: "สถานะสมรส",
    required: true,
    aliases: ["สถานภาพสมรส", "maritalStatus", "marital_status"],
    ruleSummary: "โสด, สมรส หรือ หย่าร้าง / หม้าย",
  },
  {
    key: "childrenCount",
    header: "จำนวนบุตร",
    required: true,
    aliases: ["จำนวนบุตร (สูงสุด 2 คน)", "childrenCount", "children_count"],
    ruleSummary: "ตัวเลข 0, 1 หรือ 2",
  },
  {
    key: "startDate",
    header: "วันเริ่มงาน",
    required: true,
    aliases: ["startDate", "hireDate", "hire_date"],
    ruleSummary: "YYYY-MM-DD (ค.ศ.)",
  },
  {
    key: "department",
    header: "แผนก",
    required: true,
    aliases: ["department", "department_id", "departmentId"],
    ruleSummary: "ชื่อแผนกภาษาไทย หรือรหัสแผนกที่เปิดใช้งานในระบบ",
  },
  {
    key: "position",
    header: "ตำแหน่ง",
    required: true,
    aliases: ["position", "position_id", "positionId"],
    ruleSummary: "ชื่อตำแหน่งภาษาไทย หรือรหัสตำแหน่งที่เปิดใช้งานในระบบ",
  },
  {
    key: "jobLevel",
    header: "ระดับ",
    required: false,
    aliases: ["jobLevel", "job_level", "job_level_id", "jobLevelId"],
    ruleSummary: "ชื่อระดับ หรือรหัสระดับในระบบ (เว้นว่างได้)",
  },
  {
    key: "managerCode",
    header: "รหัสหัวหน้า",
    required: false,
    aliases: ["หัวหน้า", "managerCode", "manager_code", "manager_employee_id"],
    ruleSummary: "รหัสพนักงานของหัวหน้าที่ทำงานอยู่ เช่น E00014 (เว้นว่างได้)",
  },
  {
    key: "email",
    header: "อีเมล",
    required: true,
    aliases: ["อีเมลติดต่อ", "email", "contactEmail"],
    ruleSummary: "รูปแบบอีเมลถูกต้อง ห้ามซ้ำในไฟล์และในระบบ",
  },
  {
    key: "phone",
    header: "เบอร์โทรศัพท์",
    required: false,
    aliases: ["เบอร์โทร", "โทรศัพท์", "phone"],
    ruleSummary: "เบอร์โทรศัพท์ (เว้นว่างได้)",
  },
  {
    key: "emergencyContactName",
    header: "ผู้ติดต่อฉุกเฉิน",
    required: false,
    aliases: ["emergencyContactName", "emergency_contact_name"],
    ruleSummary: "ชื่อผู้ติดต่อฉุกเฉิน (เว้นว่างได้)",
  },
  {
    key: "emergencyContactPhone",
    header: "เบอร์ฉุกเฉิน",
    required: false,
    aliases: ["เบอร์ผู้ติดต่อฉุกเฉิน", "emergencyContactPhone", "emergency_contact_phone"],
    ruleSummary: "เบอร์ผู้ติดต่อฉุกเฉิน (เว้นว่างได้)",
  },
  {
    key: "currentAddress",
    header: "ที่อยู่",
    required: true,
    aliases: ["currentAddress", "addressLine", "address_line"],
    ruleSummary: "บ้านเลขที่ หมู่ ถนน ซอย (ห้ามว่าง)",
  },
  {
    key: "subdistrict",
    header: "ตำบล/แขวง",
    required: false,
    aliases: ["ตำบล", "แขวง", "subdistrict"],
    ruleSummary: "ตำบล/แขวง (เว้นว่างได้)",
  },
  {
    key: "district",
    header: "อำเภอ/เขต",
    required: false,
    aliases: ["อำเภอ", "เขต", "district"],
    ruleSummary: "อำเภอ/เขต (เว้นว่างได้)",
  },
  {
    key: "province",
    header: "จังหวัด",
    required: false,
    aliases: ["province"],
    ruleSummary: "จังหวัด (เว้นว่างได้)",
  },
  {
    key: "postalCode",
    header: "รหัสไปรษณีย์",
    required: false,
    aliases: ["postalCode", "postal_code"],
    ruleSummary: "ตัวเลข 5 หลัก (เว้นว่างได้)",
  },
  {
    key: "fatherFirstName",
    header: "ชื่อบิดา",
    required: false,
    aliases: ["fatherFirstName", "father_first_name"],
    ruleSummary: "ชื่อบิดา (เว้นว่างได้)",
  },
  {
    key: "fatherLastName",
    header: "นามสกุลบิดา",
    required: false,
    aliases: ["fatherLastName", "father_last_name"],
    ruleSummary: "นามสกุลบิดา (เว้นว่างได้)",
  },
  {
    key: "motherFirstName",
    header: "ชื่อมารดา",
    required: false,
    aliases: ["motherFirstName", "mother_first_name"],
    ruleSummary: "ชื่อมารดา (เว้นว่างได้)",
  },
  {
    key: "motherLastName",
    header: "นามสกุลมารดา",
    required: false,
    aliases: ["motherLastName", "mother_last_name"],
    ruleSummary: "นามสกุลมารดา (เว้นว่างได้)",
  },
];

export const EMPLOYEE_CSV_HEADERS = EMPLOYEE_CSV_COLUMNS.map((col) => col.header);

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/\*/g, "").replace(/\s+/g, " ").toLowerCase();
}

const HEADER_TO_KEY = new Map<string, EmployeeCsvFieldKey>();
for (const col of EMPLOYEE_CSV_COLUMNS) {
  HEADER_TO_KEY.set(normalizeHeader(col.header), col.key);
  for (const alias of col.aliases) {
    HEADER_TO_KEY.set(normalizeHeader(alias), col.key);
  }
}

export type ParseEmployeeCsvResult =
  | { ok: true; rows: EmployeeCsvRowInput[] }
  | { ok: false; error: string };

/** แปลงข้อความ CSV เป็นรายการพนักงาน พร้อมตรวจหัวตารางและจำนวนแถว */
export function parseEmployeeCsvText(text: string): ParseEmployeeCsvResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { ok: false, error: "ไฟล์ CSV ว่างเปล่า ไม่พบหัวตารางและข้อมูลพนักงาน" };
  }

  const rawHeaders = table[0];
  const colIndexByKey = new Map<EmployeeCsvFieldKey, number>();
  const duplicateHeaders: string[] = [];

  rawHeaders.forEach((cell, idx) => {
    const key = HEADER_TO_KEY.get(normalizeHeader(cell));
    if (!key) return;
    if (colIndexByKey.has(key)) {
      duplicateHeaders.push(cell.trim());
    } else {
      colIndexByKey.set(key, idx);
    }
  });

  if (duplicateHeaders.length > 0) {
    return {
      ok: false,
      error: `พบคอลัมน์ซ้ำในหัวตาราง: ${[...new Set(duplicateHeaders)].join(", ")}`,
    };
  }

  const missingRequired = EMPLOYEE_CSV_COLUMNS.filter(
    (col) => col.required && !colIndexByKey.has(col.key),
  ).map((col) => col.header);

  if (missingRequired.length > 0) {
    return {
      ok: false,
      error: `หัวตารางไฟล์ CSV ขาดคอลัมน์บังคับ: ${missingRequired.join(", ")} (แนะนำให้ดาวน์โหลดไฟล์ตัวอย่าง CSV เพื่อใช้เป็นต้นแบบ)`,
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length === 0) {
    return {
      ok: false,
      error: "ไม่พบข้อมูลพนักงานในไฟล์ CSV (ต้องมีอย่างน้อย 1 แถวถัดจากหัวตาราง)",
    };
  }

  if (dataRows.length > MAX_CSV_IMPORT_ROWS) {
    return {
      ok: false,
      error: `นำเข้าได้สูงสุดครั้งละ ${MAX_CSV_IMPORT_ROWS} คน (ไฟล์นี้มี ${dataRows.length} แถว)`,
    };
  }

  const cellOf = (cells: string[], key: EmployeeCsvFieldKey): string => {
    const idx = colIndexByKey.get(key);
    return idx === undefined ? "" : (cells[idx] ?? "").trim();
  };

  const rows: EmployeeCsvRowInput[] = dataRows.map((cells, idx) => ({
    rowNumber: idx + 2,
    prefix: cellOf(cells, "prefix"),
    firstName: cellOf(cells, "firstName"),
    lastName: cellOf(cells, "lastName"),
    firstNameEn: cellOf(cells, "firstNameEn"),
    lastNameEn: cellOf(cells, "lastNameEn"),
    nickname: cellOf(cells, "nickname"),
    gender: cellOf(cells, "gender"),
    birthDate: cellOf(cells, "birthDate"),
    citizenId: cellOf(cells, "citizenId"),
    nationality: cellOf(cells, "nationality"),
    religion: cellOf(cells, "religion"),
    maritalStatus: cellOf(cells, "maritalStatus"),
    childrenCount: cellOf(cells, "childrenCount"),
    startDate: cellOf(cells, "startDate"),
    department: cellOf(cells, "department"),
    position: cellOf(cells, "position"),
    jobLevel: cellOf(cells, "jobLevel"),
    managerCode: cellOf(cells, "managerCode"),
    email: cellOf(cells, "email"),
    phone: cellOf(cells, "phone"),
    emergencyContactName: cellOf(cells, "emergencyContactName"),
    emergencyContactPhone: cellOf(cells, "emergencyContactPhone"),
    currentAddress: cellOf(cells, "currentAddress"),
    subdistrict: cellOf(cells, "subdistrict"),
    district: cellOf(cells, "district"),
    province: cellOf(cells, "province"),
    postalCode: cellOf(cells, "postalCode"),
    fatherFirstName: cellOf(cells, "fatherFirstName"),
    fatherLastName: cellOf(cells, "fatherLastName"),
    motherFirstName: cellOf(cells, "motherFirstName"),
    motherLastName: cellOf(cells, "motherLastName"),
  }));

  return { ok: true, rows };
}

function validateCalendarDate(value: string, label: string): { ok: true } | { ok: false; error: string } {
  if (!DATE_RE.test(value)) {
    return { ok: false, error: `${label}ต้องเป็นรูปแบบ YYYY-MM-DD (ปี ค.ศ.) เช่น 2026-04-01` };
  }
  const [year, month, day] = value.split("-").map(Number);
  if (year >= 2400) {
    return { ok: false, error: `${label}กรุณาระบุปี ค.ศ. (เช่น 2026 แทน 2569)` };
  }
  if (year < 1900) {
    return { ok: false, error: `${label}ปี ค.ศ. ต้องตั้งแต่ 1900 ขึ้นไป` };
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  const valid =
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day;
  if (!valid) {
    return { ok: false, error: `${label}ไม่มีอยู่จริงในปฏิทิน (${value})` };
  }
  return { ok: true };
}

function matchOrgOption(options: OrgOption[], raw: string): OrgOption | null {
  const key = normalizeKey(raw);
  if (!key) return null;
  return (
    options.find((opt) => opt.id.toLowerCase() === key) ??
    options.find((opt) => opt.code && normalizeKey(opt.code) === key) ??
    options.find((opt) => normalizeKey(opt.name) === key) ??
    options.find((opt) => opt.code && normalizeKey(`${opt.code} ${opt.name}`) === key) ??
    null
  );
}

function extractManagerCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (MANAGER_CODE_RE.test(trimmed)) return trimmed.toUpperCase();
  const paren = trimmed.match(MANAGER_PAREN_RE);
  if (paren) return paren[1].toUpperCase();
  return null;
}

function normalizeMaritalStatus(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, "");
  if (compact === "หย่าร้าง/หม้าย") return "หย่าร้าง / หม้าย";
  return raw.trim();
}

export interface ActiveManagerRef {
  id: string;
  code: string;
  name: string;
}

export interface ValidatedEmployeeRecord {
  title_th: string | null;
  first_name_th: string;
  last_name_th: string;
  first_name_en: string | null;
  last_name_en: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_line: string;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  department_id: string;
  position_id: string;
  job_level_id: string | null;
  manager_employee_id: string | null;
  hire_date: string;
  gender: string;
  nationality: string;
  citizen_id: string;
  birth_date: string;
  religion: string | null;
  marital_status: string;
  children_count: number;
  father_first_name: string | null;
  father_last_name: string | null;
  mother_first_name: string | null;
  mother_last_name: string | null;
}

export interface CsvRowPreview {
  rowNumber: number;
  fullName: string;
  email: string;
  departmentName: string;
  positionName: string;
  jobLevelName: string;
  managerLabel: string;
  startDate: string;
  valid: boolean;
  errors: string[];
}

export interface ValidateCsvContext {
  org: OrgOptions;
  managers: ActiveManagerRef[];
  existingEmails: Set<string>;
  existingCitizenIds: Set<string>;
  today: string;
}

export interface ValidatedCsvRowResult {
  preview: CsvRowPreview;
  record: ValidatedEmployeeRecord | null;
}

/** ตรวจสอบข้อมูลพนักงานทุกแถวจาก CSV เทียบกับกฎระบบและข้อมูลปัจจุบันในฐานข้อมูล */
export function validateEmployeeCsvRows(
  rows: EmployeeCsvRowInput[],
  ctx: ValidateCsvContext,
): ValidatedCsvRowResult[] {
  const managerByCode = new Map(ctx.managers.map((m) => [m.code.toUpperCase(), m]));
  const seenEmails = new Map<string, number>();
  const seenCitizenIds = new Map<string, number>();

  return rows.map((row): ValidatedCsvRowResult => {
    const errors: string[] = [];

    const prefix = row.prefix.trim();
    let titleTh: string | null = null;
    if (prefix === "" || prefix === "อื่น ๆ" || prefix === "อื่นๆ") {
      titleTh = null;
    } else if ((EMPLOYEE_CSV_PREFIXES as readonly string[]).includes(prefix)) {
      titleTh = prefix;
    } else {
      errors.push("คำนำหน้าต้องเป็น นาย, นาง, นางสาว, อื่น ๆ หรือเว้นว่าง");
    }

    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    if (!firstName) errors.push("กรุณาระบุชื่อ");
    if (!lastName) errors.push("กรุณาระบุนามสกุล");

    const gender = row.gender.trim();
    if (!(EMPLOYEE_CSV_GENDERS as readonly string[]).includes(gender)) {
      errors.push("เพศต้องเป็น ชาย, หญิง หรือ ไม่ระบุ");
    }

    const startDate = row.startDate.trim();
    const startCheck = startDate ? validateCalendarDate(startDate, "วันเริ่มงาน") : { ok: false as const, error: "กรุณาระบุวันเริ่มงาน" };
    if (!startCheck.ok) errors.push(startCheck.error);

    const birthDate = row.birthDate.trim();
    const birthCheck = birthDate ? validateCalendarDate(birthDate, "วันเกิด") : { ok: false as const, error: "กรุณาระบุวันเกิด" };
    if (!birthCheck.ok) {
      errors.push(birthCheck.error);
    } else {
      if (birthDate > ctx.today) errors.push("วันเกิดต้องไม่เป็นวันในอนาคต");
      if (startCheck.ok && birthDate >= startDate) errors.push("วันเกิดต้องอยู่ก่อนวันเริ่มงาน");
    }

    const citizenId = row.citizenId.replace(/[\s-]/g, "");
    if (!CITIZEN_ID_RE.test(citizenId)) {
      errors.push("เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
    } else {
      const dupRow = seenCitizenIds.get(citizenId);
      if (dupRow !== undefined) {
        errors.push(`เลขบัตรประชาชนซ้ำกับแถวที่ ${dupRow} ในไฟล์`);
      } else {
        seenCitizenIds.set(citizenId, row.rowNumber);
        if (ctx.existingCitizenIds.has(citizenId)) {
          errors.push("เลขบัตรประชาชนนี้มีในระบบแล้ว");
        }
      }
    }

    const nationality = row.nationality.trim();
    if (!nationality) errors.push("กรุณาระบุสัญชาติ");

    const maritalStatus = normalizeMaritalStatus(row.maritalStatus);
    if (!(EMPLOYEE_CSV_MARITAL_STATUSES as readonly string[]).includes(maritalStatus)) {
      errors.push("สถานะสมรสต้องเป็น โสด, สมรส หรือ หย่าร้าง / หม้าย");
    }

    const childrenCountText = row.childrenCount.trim();
    if (!/^[0-2]$/.test(childrenCountText)) {
      errors.push("จำนวนบุตรต้องเป็น 0, 1 หรือ 2");
    }

    const deptMatch = row.department.trim()
      ? matchOrgOption(ctx.org.departments, row.department)
      : null;
    if (!row.department.trim()) errors.push("กรุณาระบุแผนก");
    else if (!deptMatch) errors.push(`ไม่พบแผนก "${row.department.trim()}" ในระบบ`);

    const posMatch = row.position.trim()
      ? matchOrgOption(ctx.org.positions, row.position)
      : null;
    if (!row.position.trim()) errors.push("กรุณาระบุตำแหน่ง");
    else if (!posMatch) errors.push(`ไม่พบตำแหน่ง "${row.position.trim()}" ในระบบ`);

    const levelRaw = row.jobLevel.trim();
    const levelMatch = levelRaw ? matchOrgOption(ctx.org.jobLevels, levelRaw) : null;
    if (levelRaw && !levelMatch) {
      errors.push(`ไม่พบระดับ "${levelRaw}" ในระบบ`);
    }

    const managerRaw = row.managerCode.trim();
    let managerRef: ActiveManagerRef | null = null;
    if (managerRaw) {
      const code = extractManagerCode(managerRaw);
      if (!code) {
        errors.push(`รูปแบบรหัสหัวหน้าไม่ถูกต้อง ("${managerRaw}" ต้องเป็นรหัสพนักงาน เช่น E00014)`);
      } else {
        managerRef = managerByCode.get(code) ?? null;
        if (!managerRef) {
          errors.push(`ไม่พบหัวหน้ารหัส ${code} ที่กำลังทำงานอยู่ในระบบ`);
        }
      }
    }

    const email = row.email.trim();
    if (!email) {
      errors.push("กรุณาระบุอีเมล");
    } else if (!EMAIL_RE.test(email)) {
      errors.push("รูปแบบอีเมลไม่ถูกต้อง เช่น name@company.co.th");
    } else {
      const emailKey = email.toLowerCase();
      const dupRow = seenEmails.get(emailKey);
      if (dupRow !== undefined) {
        errors.push(`อีเมลซ้ำกับแถวที่ ${dupRow} ในไฟล์`);
      } else {
        seenEmails.set(emailKey, row.rowNumber);
        if (ctx.existingEmails.has(emailKey)) {
          errors.push("อีเมลนี้มีในระบบแล้ว");
        }
      }
    }

    const currentAddress = row.currentAddress.trim();
    if (!currentAddress) errors.push("กรุณาระบุที่อยู่");

    const postalCode = row.postalCode.trim();
    if (postalCode && !POSTAL_CODE_RE.test(postalCode)) {
      errors.push("รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");
    }

    const displayName = `${titleTh ?? ""}${firstName} ${lastName}`.trim() || "—";
    const preview: CsvRowPreview = {
      rowNumber: row.rowNumber,
      fullName: displayName,
      email: email || "—",
      departmentName: deptMatch?.name ?? (row.department.trim() || "—"),
      positionName: posMatch?.name ?? (row.position.trim() || "—"),
      jobLevelName: levelMatch?.name ?? (levelRaw || "—"),
      managerLabel: managerRef ? `${managerRef.name} (${managerRef.code})` : (managerRaw || "—"),
      startDate: startDate || "—",
      valid: errors.length === 0,
      errors,
    };

    if (errors.length > 0 || !deptMatch || !posMatch) {
      return { preview, record: null };
    }

    return {
      preview,
      record: {
        title_th: titleTh,
        first_name_th: firstName,
        last_name_th: lastName,
        first_name_en: row.firstNameEn.trim() || null,
        last_name_en: row.lastNameEn.trim() || null,
        nickname: row.nickname.trim() || null,
        email,
        phone: row.phone.trim() || null,
        emergency_contact_name: row.emergencyContactName.trim() || null,
        emergency_contact_phone: row.emergencyContactPhone.trim() || null,
        address_line: currentAddress,
        subdistrict: row.subdistrict.trim() || null,
        district: row.district.trim() || null,
        province: row.province.trim() || null,
        postal_code: postalCode || null,
        department_id: deptMatch.id,
        position_id: posMatch.id,
        job_level_id: levelMatch?.id ?? null,
        manager_employee_id: managerRef?.id ?? null,
        hire_date: startDate,
        gender,
        nationality,
        citizen_id: citizenId,
        birth_date: birthDate,
        religion: row.religion.trim() || null,
        marital_status: maritalStatus,
        children_count: Number(childrenCountText),
        father_first_name: row.fatherFirstName.trim() || null,
        father_last_name: row.fatherLastName.trim() || null,
        mother_first_name: row.motherFirstName.trim() || null,
        mother_last_name: row.motherLastName.trim() || null,
      },
    };
  });
}

/** สร้างแถวตัวอย่างสำหรับดาวน์โหลดไฟล์ต้นแบบ CSV โดยใช้ชื่อแผนก ตำแหน่ง และระดับจริงจากระบบ */
export function buildEmployeeCsvTemplate(org: OrgOptions, sampleManagerCode = ""): string[][] {
  const sampleDepartment = org.departments[0]?.name ?? "แผนกพัฒนาระบบ";
  const samplePosition = org.positions[0]?.name ?? "นักพัฒนาระบบ";
  const sampleLevel = org.jobLevels[0]?.name ?? "";

  return [
    [
      "นาย",
      "สมชาย",
      "ใจดี",
      "Somchai",
      "Jaidee",
      "ชาย",
      "ชาย",
      "1996-05-15",
      "1100500999999",
      "ไทย",
      "พุทธ",
      "โสด",
      "0",
      "2026-11-01",
      sampleDepartment,
      samplePosition,
      sampleLevel,
      sampleManagerCode,
      "somchai.new@company.co.th",
      "081-234-5678",
      "สมหญิง ใจดี",
      "089-876-5432",
      "99/1 ถนนสุขุมวิท",
      "คลองตัน",
      "คลองเตย",
      "กรุงเทพมหานคร",
      "10110",
      "ประเสริฐ",
      "ใจดี",
      "สมหญิง",
      "ใจดี",
    ],
  ];
}
