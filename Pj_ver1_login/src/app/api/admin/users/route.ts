import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit, type AuditChanges } from "@/lib/auth/audit";
import {
  findEmployeeCodeByUuid,
  findEmployeeUuidByCode,
  getEmployeeRecord,
  getOrgOptions,
  getUserById,
  getUserWithProfileById,
  updateEmployeeRecord,
  updateUser,
  type EmployeeColumn,
} from "@/lib/auth/users";

export const runtime = "nodejs";

const ACCOUNT_FIELDS = ["name", "email", "role", "status"] as const;

type FieldSpec = {
  column: EmployeeColumn;
  label: string;
  required?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ฟิลด์ของตาราง employee ที่แก้ได้ แยกตามส่วนในหน้าตั้งค่าผู้ใช้งาน (ชื่อฟิลด์ตรงกับ EmployeeProfile) */
const EMPLOYEE_SECTIONS: Record<"personal" | "contact" | "work", Record<string, FieldSpec>> = {
  personal: {
    titleTh: { column: "title_th", label: "คำนำหน้า" },
    firstNameTh: { column: "first_name_th", label: "ชื่อ (ไทย)", required: true },
    lastNameTh: { column: "last_name_th", label: "นามสกุล (ไทย)", required: true },
    firstNameEn: { column: "first_name_en", label: "ชื่อ (อังกฤษ)" },
    lastNameEn: { column: "last_name_en", label: "นามสกุล (อังกฤษ)" },
    nickname: { column: "nickname", label: "ชื่อเล่น" },
  },
  contact: {
    contactEmail: { column: "email", label: "อีเมลติดต่อ", required: true, pattern: EMAIL_RE, patternMessage: "รูปแบบอีเมลติดต่อไม่ถูกต้อง" },
    phone: { column: "phone", label: "เบอร์โทร" },
    emergencyContactName: { column: "emergency_contact_name", label: "ผู้ติดต่อฉุกเฉิน" },
    emergencyContactPhone: { column: "emergency_contact_phone", label: "เบอร์ผู้ติดต่อฉุกเฉิน" },
    addressLine: { column: "address_line", label: "ที่อยู่" },
    subdistrict: { column: "subdistrict", label: "ตำบล/แขวง" },
    district: { column: "district", label: "อำเภอ/เขต" },
    province: { column: "province", label: "จังหวัด" },
    postalCode: { column: "postal_code", label: "รหัสไปรษณีย์", pattern: /^\d{5}$/, patternMessage: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" },
  },
  work: {
    departmentId: { column: "department_id", label: "แผนก" },
    positionId: { column: "position_id", label: "ตำแหน่ง" },
    jobLevelId: { column: "job_level_id", label: "ระดับ" },
    managerCode: { column: "manager_employee_id", label: "หัวหน้า" },
    hireDate: { column: "hire_date", label: "วันเริ่มงาน", required: true, pattern: DATE_RE, patternMessage: "รูปแบบวันเริ่มงานไม่ถูกต้อง" },
  },
};

type Section = "account" | keyof typeof EMPLOYEE_SECTIONS;

class InputError extends Error {}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { employeeId } = body;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const section: Section = body.section ?? "account";
    const values: Record<string, unknown> = body.values ?? body;

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json({ error: "ไม่พบรหัสพนักงาน" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลการเปลี่ยนแปลง" }, { status: 400 });
    }
    if (section !== "account" && !(section in EMPLOYEE_SECTIONS)) {
      return NextResponse.json({ error: "ส่วนข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const changes =
      section === "account"
        ? await saveAccount(employeeId, values, reason)
        : await saveEmployee(employeeId, EMPLOYEE_SECTIONS[section], values);

    if (changes === null) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    if (Object.keys(changes).length > 0) {
      await writeAudit({
        action: "USER_UPDATE",
        userId: session.sub,
        ip: getClientIp(req.headers),
        targetId: employeeId,
        changes,
        reason,
      });
    }

    const user = await getUserWithProfileById(employeeId);
    return NextResponse.json({ ok: true, updatedAt: user?.updatedAt, user });
  } catch (err) {
    if (err instanceof InputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error updating user:", err);
    // กฎธุรกิจจากฐานข้อมูล (P0001) เช่น ไม่อนุญาตให้กลับมาทำงานหลังลาออก — แสดงข้อความให้ผู้ใช้
    const pg = err as { code?: string; message?: string };
    if (pg?.code === "P0001" && pg.message) {
      return NextResponse.json({ error: pg.message }, { status: 400 });
    }
    if (pg?.code === "23505") {
      return NextResponse.json({ error: "อีเมล/ชื่อล็อกอินนี้ถูกใช้งานแล้ว" }, { status: 409 });
    }
    if (pg?.code === "23514") {
      return NextResponse.json({ error: "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}

/** บัญชีเข้าใช้งาน: ชื่อล็อกอิน / บทบาท / สถานะ (employeeId เป็นรหัสพนักงาน — ไม่อนุญาตให้แก้ไข) */
async function saveAccount(employeeId: string, values: Record<string, unknown>, reason: string): Promise<AuditChanges | null> {
  const before = await getUserById(employeeId);
  if (!before) return null;

  const update: Record<string, string> = {};
  const changes: AuditChanges = {};
  for (const field of ACCOUNT_FIELDS) {
    const value = values[field];
    if (typeof value === "string" && value !== before[field]) {
      update[field] = value;
      changes[field] = { old: before[field], new: value };
    }
  }

  if (Object.keys(changes).length > 0) {
    await updateUser(employeeId, update, reason);
  }
  return changes;
}

/** ข้อมูลพนักงาน: เก็บเฉพาะคอลัมน์ที่เปลี่ยนจริง */
async function saveEmployee(
  employeeId: string,
  fields: Record<string, FieldSpec>,
  values: Record<string, unknown>,
): Promise<AuditChanges | null> {
  const before = await getEmployeeRecord(employeeId);
  if (!before) return null;

  const patch: Partial<Record<EmployeeColumn, string | null>> = {};
  const changes: AuditChanges = {};

  for (const [key, spec] of Object.entries(fields)) {
    if (!(key in values)) continue;
    const raw = values[key];
    if (raw !== null && typeof raw !== "string") throw new InputError(`${spec.label} ไม่ถูกต้อง`);
    const text = (raw ?? "").trim();

    if (!text && spec.required) throw new InputError(`กรุณากรอก${spec.label}`);
    if (text && spec.pattern && !spec.pattern.test(text)) throw new InputError(spec.patternMessage ?? `${spec.label} ไม่ถูกต้อง`);

    let next: string | null = text || null;
    let oldLabel: unknown = before[spec.column];
    let newLabel: unknown = next;

    if (spec.column === "manager_employee_id") {
      if (next === employeeId) throw new InputError("หัวหน้าต้องไม่ใช่ตัวพนักงานเอง");
      const managerUuid = next ? await findEmployeeUuidByCode(next) : null;
      if (next && !managerUuid) throw new InputError("ไม่พบพนักงานที่เลือกเป็นหัวหน้า");
      oldLabel = before.manager_employee_id ? await findEmployeeCodeByUuid(before.manager_employee_id) : null;
      next = managerUuid;
    }

    if (next === before[spec.column]) continue;
    patch[spec.column] = next;
    changes[key] = { old: oldLabel, new: newLabel };
  }

  if (Object.keys(patch).length === 0) return changes;

  // บันทึกชื่อแผนก/ตำแหน่ง/ระดับใน log แทน uuid ให้อ่านง่าย
  if (patch.department_id !== undefined || patch.position_id !== undefined || patch.job_level_id !== undefined) {
    const options = await getOrgOptions();
    const nameOf = (list: { id: string; name: string }[], id: unknown) => list.find((o) => o.id === id)?.name ?? id ?? null;
    const lists = { departmentId: options.departments, positionId: options.positions, jobLevelId: options.jobLevels };
    for (const [key, list] of Object.entries(lists)) {
      const change = changes[key];
      if (!change) continue;
      if (change.new && !list.some((o) => o.id === change.new)) throw new InputError(`${fields[key].label} ที่เลือกไม่มีในระบบ`);
      changes[key] = { old: nameOf(list, change.old), new: nameOf(list, change.new) };
    }
  }

  await updateEmployeeRecord(before.id, patch);
  return changes;
}
