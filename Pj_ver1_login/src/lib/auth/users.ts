import bcrypt from "bcryptjs";
import type { Role } from "./roles";
import { supabaseAdmin } from "../supabase";
import { toPasswordState, type PasswordState } from "./credential";
import { checkLock, clearFailures } from "./rate-limit";

/**
 * บัญชีผู้ใช้อ่านจาก view `v_app_user` (employee + employee_credential + user_role)
 * เขียนผ่านฟังก์ชัน `admin_update_user_account` / `admin_create_user_account`
 * ตาราง `users` เดิมถูกรวมเข้า `employee` แล้ว
 */
export type EmploymentStatus = "ACTIVE" | "RESIGNED" | "DECEASED";

export interface User {
  employeeId: string; // employee.employee_code
  email: string; // ชื่อที่ใช้ล็อกอิน (อีเมล หรือ username)
  name: string;
  role: Role;
  status: EmploymentStatus;
  passwordHash: string;
  /** มีเฉพาะผลจาก findUserByIdentifier (ใช้ตอนล็อกอิน) */
  passwordState?: PasswordState;
  lastLoginAt?: string;
  updatedAt?: string;
}

/** ข้อมูลพนักงานจากตาราง employee (อ่านอย่างเดียวในหน้าตั้งค่าผู้ใช้งาน) */
export interface EmployeeProfile {
  titleTh: string | null;
  firstNameTh: string;
  lastNameTh: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  nickname: string | null;
  contactEmail: string | null;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  jobLevelId: string | null;
  jobLevelName: string | null;
  managerCode: string | null;
  managerName: string | null;
  hireDate: string | null;
  resignedDate: string | null;
  deceasedDate: string | null;
  statusReason: string | null;
  gender: string | null;
  nationality: string | null;
  /** แสดงเฉพาะ 4 หลักท้าย เลขเต็มไม่ถูกส่งออกไปหน้าเว็บ */
  citizenIdMasked: string | null;
  birthDate: string | null;
  religion: string | null;
  maritalStatus: string | null;
  childrenCount: number | null;
  fatherFirstName: string | null;
  fatherLastName: string | null;
  motherFirstName: string | null;
  motherLastName: string | null;
}

export type UserWithProfile = Omit<User, "passwordHash" | "passwordState"> & {
  /** false = อยู่ในตาราง employee แต่ยังไม่มีบัญชีเข้าระบบ */
  hasAccount: boolean;
  /** เวลาที่บัญชีถูกล็อกถึง (ISO) หรือ null ถ้าไม่ได้ถูกล็อก */
  lockedUntil?: string | null;
  failedAttempts?: number;
  profile: EmployeeProfile;
};

interface UserRow {
  employee_uuid: string;
  employee_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  updated_at: string | null;
}

interface EmployeeProfileRow {
  employee_code: string;
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
  address_line: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  department_id: string | null;
  position_id: string | null;
  job_level_id: string | null;
  employment_status: string;
  hire_date: string | null;
  resigned_date: string | null;
  deceased_date: string | null;
  status_reason: string | null;
  updated_at: string;
  gender: string | null;
  nationality: string | null;
  citizen_id: string | null;
  birth_date: string | null;
  religion: string | null;
  marital_status: string | null;
  children_count: number | null;
  father_first_name: string | null;
  father_last_name: string | null;
  mother_first_name: string | null;
  mother_last_name: string | null;
  department: { name_th: string } | null;
  position: { name_th: string } | null;
  job_level: { name_th: string } | null;
  manager: { employee_code: string; first_name_th: string; last_name_th: string; deleted_at: string | null } | null;
  credential: {
    login_name: string;
    last_login_at: string | null;
    updated_at: string | null;
  } | null;
  roles: { revoked_at: string | null; role: { code: string; is_active: boolean } | null }[];
}

const VIEW_COLUMNS = "employee_uuid, employee_id, email, name, role, status, last_login_at, updated_at";

// อ่านจากตาราง employee เหมือนฝั่ง HR จึงเห็นพนักงานทุกคน รวมถึงคนที่ยังไม่มีบัญชีเข้าระบบ
const EMPLOYEE_PROFILE_COLUMNS = `employee_code, title_th, first_name_th, last_name_th, first_name_en, last_name_en, nickname,
  email, phone, emergency_contact_name, emergency_contact_phone,
  address_line, subdistrict, district, province, postal_code,
  department_id, position_id, job_level_id, employment_status,
  hire_date, resigned_date, deceased_date, status_reason, updated_at,
  gender, nationality, citizen_id, birth_date, religion, marital_status, children_count,
  father_first_name, father_last_name, mother_first_name, mother_last_name,
  department:department_id(name_th),
  position:position_id(name_th),
  job_level:job_level_id(name_th),
  manager:manager_employee_id(employee_code, first_name_th, last_name_th, deleted_at),
  credential:employee_credential(login_name, last_login_at, updated_at),
  roles:user_role!employee_id(revoked_at, role:role_id(code, is_active))`;

function toUser(row: UserRow): Omit<User, "passwordHash"> {
  return {
    employeeId: row.employee_id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    status: row.status as EmploymentStatus,
    lastLoginAt: row.last_login_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

const displayName = (first: string, last: string) => (last === "-" ? first : `${first} ${last}`).trim();

/** บทบาทหลักของพนักงาน ใช้ลำดับเดียวกับ view v_app_user */
function primaryRole(roles: EmployeeProfileRow["roles"]): Role {
  const active = roles.filter((r) => !r.revoked_at && r.role?.is_active).map((r) => r.role!.code);
  return (["SUPER_ADMIN", "HR", "FINANCE"].find((code) => active.includes(code)) ?? active[0] ?? "EMPLOYEE") as Role;
}

function toUserWithProfile(row: EmployeeProfileRow): UserWithProfile {
  const manager = row.manager && !row.manager.deleted_at ? row.manager : null;
  const credentialUpdatedAt = row.credential?.updated_at ?? "";
  const codeLock = checkLock(row.employee_code.toLowerCase());
  const loginLock = row.credential?.login_name ? checkLock(row.credential.login_name.toLowerCase()) : { locked: false, retryAfterSec: 0 };
  const retryAfterSec = Math.max(codeLock.locked ? codeLock.retryAfterSec : 0, loginLock.locked ? loginLock.retryAfterSec : 0);
  return {
    employeeId: row.employee_code,
    email: row.credential?.login_name ?? "",
    name: displayName(row.first_name_th, row.last_name_th),
    role: primaryRole(row.roles),
    status: row.employment_status.toUpperCase() as EmploymentStatus,
    lastLoginAt: row.credential?.last_login_at ?? undefined,
    updatedAt: credentialUpdatedAt > row.updated_at ? credentialUpdatedAt : row.updated_at,
    hasAccount: row.credential !== null,
    lockedUntil: retryAfterSec > 0 ? new Date(Date.now() + retryAfterSec * 1000).toISOString() : null,
    failedAttempts: 0,
    profile: {
      titleTh: row.title_th,
      firstNameTh: row.first_name_th,
      lastNameTh: row.last_name_th === "-" ? null : row.last_name_th,
      firstNameEn: row.first_name_en,
      lastNameEn: row.last_name_en,
      nickname: row.nickname,
      contactEmail: row.email,
      phone: row.phone,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      addressLine: row.address_line,
      subdistrict: row.subdistrict,
      district: row.district,
      province: row.province,
      postalCode: row.postal_code,
      departmentId: row.department_id,
      departmentName: row.department?.name_th ?? null,
      positionId: row.position_id,
      positionName: row.position?.name_th ?? null,
      jobLevelId: row.job_level_id,
      jobLevelName: row.job_level?.name_th ?? null,
      managerCode: manager?.employee_code ?? null,
      managerName: manager ? displayName(manager.first_name_th, manager.last_name_th) : null,
      hireDate: row.hire_date,
      resignedDate: row.resigned_date,
      deceasedDate: row.deceased_date,
      statusReason: row.status_reason,
      gender: row.gender,
      nationality: row.nationality,
      citizenIdMasked: row.citizen_id ? `•••••••••${row.citizen_id.slice(-4)}` : null,
      birthDate: row.birth_date,
      religion: row.religion,
      maritalStatus: row.marital_status,
      childrenCount: row.children_count,
      fatherFirstName: row.father_first_name,
      fatherLastName: row.father_last_name,
      motherFirstName: row.mother_first_name,
      motherLastName: row.mother_last_name,
    },
  };
}

/** หา employee.id (uuid) จากรหัสพนักงาน */
async function findEmployeeUuid(employeeCode: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("employee")
    .select("id")
    .eq("employee_code", employeeCode)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const key = identifier.trim().toLowerCase();

  try {
    // ลองชื่อล็อกอิน/อีเมลก่อน แล้วค่อยรหัสพนักงาน (เทียบตรงตัว ไม่สนตัวพิมพ์)
    for (const column of ["login_key", "code_key"] as const) {
      const { data, error } = await supabaseAdmin
        .from("v_app_user")
        .select(VIEW_COLUMNS)
        .eq(column, key)
        .maybeSingle();
      if (error) throw error;
      if (!data) continue;

      const { data: cred, error: credError } = await supabaseAdmin
        .from("employee_credential")
        .select("password_hash, password_changed_at, must_change_password")
        .eq("employee_id", data.employee_uuid)
        .single();
      if (credError) throw credError;

      return { ...toUser(data as UserRow), passwordHash: cred.password_hash, passwordState: toPasswordState(cred) };
    }
  } catch (err) {
    console.error("Supabase findUser error", err);
  }
  return null;
}

export async function markLogin(employeeId: string): Promise<void> {
  try {
    const uuid = await findEmployeeUuid(employeeId);
    if (!uuid) return;
    const { error } = await supabaseAdmin
      .from("employee_credential")
      .update({ last_login_at: new Date().toISOString() })
      .eq("employee_id", uuid);
    if (error) throw error;
  } catch (err) {
    console.error("Supabase markLogin error", err);
  }
}

// Pre-computed hash for dummy timing comparison (bcrypt 10 rounds for "dummy-password-for-timing")
const DUMMY_HASH = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW";

export async function verifyPassword(user: User | null, password: string): Promise<boolean> {
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  return user !== null && ok;
}

export async function getAllUsers(): Promise<Omit<User, "passwordHash">[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("v_app_user")
      .select(VIEW_COLUMNS)
      .order("employee_id", { ascending: true });
    if (error) throw error;
    return (data as UserRow[]).map(toUser);
  } catch (err) {
    console.error("Supabase getAllUsers error", err);
  }
  return [];
}

/** พนักงานทุกคนจากตาราง employee พร้อมบัญชีเข้าระบบ (ถ้ามี) ใช้เฉพาะหน้าตั้งค่าผู้ใช้งานของ SUPER_ADMIN */
export async function getAllUsersWithProfile(): Promise<UserWithProfile[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("employee")
      .select(EMPLOYEE_PROFILE_COLUMNS)
      .is("deleted_at", null)
      .order("employee_code", { ascending: true });
    if (error) throw error;
    return (data as unknown as EmployeeProfileRow[]).map(toUserWithProfile);
  } catch (err) {
    console.error("Supabase getAllUsersWithProfile error", err);
  }
  return [];
}

export async function getUserWithProfileById(employeeId: string): Promise<UserWithProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("employee")
    .select(EMPLOYEE_PROFILE_COLUMNS)
    .eq("employee_code", employeeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toUserWithProfile(data as unknown as EmployeeProfileRow) : null;
}

export type OrgOption = { id: string; name: string };
export type OrgOptions = { departments: OrgOption[]; positions: OrgOption[]; jobLevels: OrgOption[] };

/** ตัวเลือกแผนก / ตำแหน่ง / ระดับ ที่ยังใช้งานอยู่ */
export async function getOrgOptions(): Promise<OrgOptions> {
  const load = async (tableName: "department" | "position" | "job_level", order: string) => {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("id, name_th")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order(order, { ascending: true });
    if (error) throw error;
    return (data as { id: string; name_th: string }[]).map((r) => ({ id: r.id, name: r.name_th }));
  };
  try {
    const [departments, positions, jobLevels] = await Promise.all([
      load("department", "name_th"),
      load("position", "name_th"),
      load("job_level", "rank_order"),
    ]);
    return { departments, positions, jobLevels };
  } catch (err) {
    console.error("Supabase getOrgOptions error", err);
    return { departments: [], positions: [], jobLevels: [] };
  }
}

/** คอลัมน์ของตาราง employee ที่หน้าตั้งค่าผู้ใช้งานแก้ไขได้ (ฟิลด์ส่วนตัว / ติดต่อ / การทำงาน) */
export const EMPLOYEE_EDITABLE_COLUMNS = [
  "title_th",
  "first_name_th",
  "last_name_th",
  "first_name_en",
  "last_name_en",
  "nickname",
  "email",
  "phone",
  "emergency_contact_name",
  "emergency_contact_phone",
  "address_line",
  "subdistrict",
  "district",
  "province",
  "postal_code",
  "department_id",
  "position_id",
  "job_level_id",
  "manager_employee_id",
  "hire_date",
  "gender",
  "nationality",
  "citizen_id",
  "birth_date",
  "religion",
  "marital_status",
  "children_count",
  "father_first_name",
  "father_last_name",
  "mother_first_name",
  "mother_last_name",
] as const;

export type EmployeeColumn = (typeof EMPLOYEE_EDITABLE_COLUMNS)[number];
export type EmployeeRecord = { id: string } & Record<EmployeeColumn, string | null>;

export async function getEmployeeRecord(employeeCode: string): Promise<EmployeeRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("employee")
    .select(`id, ${EMPLOYEE_EDITABLE_COLUMNS.join(", ")}`)
    .eq("employee_code", employeeCode)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as EmployeeRecord) ?? null;
}

/** แก้ไขข้อมูลพนักงาน (trigger ฝั่งฐานข้อมูลตรวจหัวหน้า และบันทึกประวัติการทำงานให้เอง) */
export async function updateEmployeeRecord(employeeUuid: string, patch: Partial<Record<EmployeeColumn, string | null>>): Promise<void> {
  const { error } = await supabaseAdmin.from("employee").update(patch).eq("id", employeeUuid);
  if (error) throw error;
}

/** แปลงรหัสพนักงาน ↔ uuid (ใช้กับช่องหัวหน้า) */
export async function findEmployeeUuidByCode(employeeCode: string): Promise<string | null> {
  return findEmployeeUuid(employeeCode);
}

export async function findEmployeeCodeByUuid(uuid: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("employee").select("employee_code").eq("id", uuid).maybeSingle();
  if (error) throw error;
  return (data as { employee_code: string } | null)?.employee_code ?? null;
}

/** ออกบัญชีให้พนักงานที่ยังไม่มีบัญชี ต้องเปลี่ยนรหัสตอนล็อกอินครั้งแรก */
export async function issueUserAccount(employeeId: string, loginName: string, passwordHash: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("admin_issue_user_account", {
    p_employee_code: employeeId,
    p_login_name: loginName,
    p_password_hash: passwordHash,
  });
  if (error) throw error;
}

export async function getUserById(employeeId: string): Promise<Omit<User, "passwordHash"> | null> {
  const { data, error } = await supabaseAdmin
    .from("v_app_user")
    .select(VIEW_COLUMNS)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

/**
 * แก้ไขบัญชีผู้ใช้ (ชื่อ / ชื่อล็อกอิน / บทบาท / สถานะ) ในหนึ่ง transaction ฝั่งฐานข้อมูล
 * `reason` ใช้เป็นเหตุผลการเปลี่ยนสถานะ (ระบบบังคับให้ระบุเมื่อเปลี่ยนสถานะ)
 * โยน error ถ้าบันทึกไม่สำเร็จ เพื่อให้ผู้เรียกแจ้งผู้ใช้และไม่เขียน audit log
 */
export async function updateUser(
  employeeId: string,
  data: Partial<User>,
  reason?: string,
): Promise<void> {
  const touchesAccount =
    data.name !== undefined || data.email !== undefined || data.role !== undefined || data.status !== undefined;

  if (touchesAccount) {
    const { error } = await supabaseAdmin.rpc("admin_update_user_account", {
      p_employee_code: employeeId,
      p_name: data.name ?? null,
      p_login_name: data.email ?? null,
      p_role: data.role ?? null,
      p_status: data.status ?? null,
      p_reason: reason ?? null,
    });
    if (error) throw error;
  }

  if (data.passwordHash !== undefined) {
    const uuid = await findEmployeeUuid(employeeId);
    if (!uuid) throw new Error("ไม่พบผู้ใช้งาน");
    const { error } = await supabaseAdmin
      .from("employee_credential")
      .update({ password_hash: data.passwordHash })
      .eq("employee_id", uuid);
    if (error) throw error;
  }
}

/** ปลดล็อกบัญชีที่ถูกล็อกจากล็อกอินผิดเกินกำหนด */
export async function unlockUserAccount(employeeId: string): Promise<boolean> {
  const user = await getUserWithProfileById(employeeId);
  if (!user) return false;
  clearFailures(employeeId.toLowerCase());
  if (user.email) clearFailures(user.email.toLowerCase());
  if (user.profile.contactEmail) clearFailures(user.profile.contactEmail.toLowerCase());
  return true;
}
