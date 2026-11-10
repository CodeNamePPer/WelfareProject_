import "server-only";
import { supabaseAdmin } from "../supabase";
import { employmentStatusLabel } from "../employmentStatus";

/**
 * รายชื่อพนักงานสำหรับฝั่ง HR (อ่านจากตาราง employee โดยตรง ไม่ผ่าน v_app_user
 * เพราะ view นั้นมีเฉพาะคนที่มีบัญชีเข้าระบบ แต่ HR ต้องเห็นพนักงานทุกคน)
 */
export type HrEmploymentStatus = "ACTIVE" | "RESIGNED" | "DECEASED";

export interface HrEmployee {
  code: string;
  name: string;
  email: string;
  /** แผนกที่สังกัด (null = ยังไม่ระบุ) */
  department: string | null;
  /** ฝ่ายแม่ของแผนก (null = แผนกอยู่ระดับบนสุด) */
  parentDepartment: string | null;
  position: string | null;
  jobLevel: string | null;
  manager: { code: string; name: string } | null;
  status: HrEmploymentStatus;
  statusLabel: string;
  hireDate: string;
  /** วันที่ลาออก / เสียชีวิต ตามสถานะ */
  statusDate: string | null;
}

type NameParts = { title_th: string | null; first_name_th: string; last_name_th: string };

interface EmployeeRow extends NameParts {
  employee_code: string;
  email: string;
  employment_status: string;
  hire_date: string;
  resigned_date: string | null;
  deceased_date: string | null;
  department: { name_th: string; parent: { name_th: string } | null } | null;
  position: { name_th: string } | null;
  job_level: { name_th: string } | null;
  manager: (NameParts & { employee_code: string }) | null;
}

const COLUMNS = `employee_code, title_th, first_name_th, last_name_th, email,
  employment_status, hire_date, resigned_date, deceased_date,
  department:department_id(name_th, parent:parent_department_id(name_th)),
  position:position_id(name_th),
  job_level:job_level_id(name_th),
  manager:manager_employee_id(employee_code, title_th, first_name_th, last_name_th)`;
// ใช้ชื่อคอลัมน์ FK เป็นตัวเลือก (เช่น manager_employee_id) เพื่อให้ได้ความสัมพันธ์แบบ many-to-one
// ถ้าใช้ "employee!manager_employee_id" กับตารางที่อ้างถึงตัวเอง PostgREST อาจคืนทิศกลับ (ลูกน้อง) เป็น array

function fullName({ title_th, first_name_th, last_name_th }: NameParts): string {
  return `${title_th ?? ""}${first_name_th} ${last_name_th}`.trim();
}

function toHrEmployee(row: EmployeeRow): HrEmployee {
  const status = row.employment_status.toUpperCase() as HrEmploymentStatus;
  return {
    code: row.employee_code,
    name: fullName(row),
    email: row.email,
    department: row.department?.name_th ?? null,
    parentDepartment: row.department?.parent?.name_th ?? null,
    position: row.position?.name_th ?? null,
    jobLevel: row.job_level?.name_th ?? null,
    manager: row.manager ? { code: row.manager.employee_code, name: fullName(row.manager) } : null,
    status,
    statusLabel: employmentStatusLabel(status),
    hireDate: row.hire_date,
    statusDate: status === "RESIGNED" ? row.resigned_date : status === "DECEASED" ? row.deceased_date : null,
  };
}

export interface NewEmployee {
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

/** เพิ่มพนักงานลงตาราง employee แล้วคืนรหัสพนักงานที่ระบบออกให้ */
export async function createHrEmployee(employee: NewEmployee): Promise<string> {
  const { data, error } = await supabaseAdmin.from("employee").insert(employee).select("employee_code").single();
  if (error) throw error;
  return (data as { employee_code: string }).employee_code;
}

/** คืน null เมื่อโหลดไม่สำเร็จ เพื่อให้หน้าจอแจ้ง "โหลดไม่สำเร็จ" แทนการแสดงรายชื่อว่างหรือข้อมูลปลอม */
export async function getHrEmployees(): Promise<HrEmployee[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("employee")
      .select(COLUMNS)
      .is("deleted_at", null)
      .order("employee_code", { ascending: true });
    if (error) throw error;
    return (data as unknown as EmployeeRow[]).map(toHrEmployee);
  } catch (err) {
    console.error("[hr] getHrEmployees failed", err);
    return null;
  }
}
