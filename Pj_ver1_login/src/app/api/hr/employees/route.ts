import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { findEmployeeUuidByCode, getOrgOptions } from "@/lib/auth/users";
import { createHrEmployee, getHrEmployees } from "@/lib/hr/employees";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PREFIXES = ["นาย", "นาง", "นางสาว"];
const GENDERS = ["ชาย", "หญิง", "ไม่ระบุ"];
const MARITAL_STATUSES = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];

/** ช่องที่ผิดส่งกลับไปให้ฟอร์มพาผู้ใช้ไปยังขั้นตอนนั้น */
function invalid(field: string, error: string, status = 400) {
  return NextResponse.json({ error, field }, { status });
}

async function canManageEmployees() {
  const session = await getSession();
  return session && (session.role === "HR" || session.role === "SUPER_ADMIN") ? session : null;
}

/** ตัวเลือกแผนก ตำแหน่ง ระดับ และหัวหน้าของฟอร์มเพิ่มพนักงาน */
export async function GET() {
  if (!(await canManageEmployees())) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  const [{ departments, positions, jobLevels }, employees] = await Promise.all([getOrgOptions(), getHrEmployees()]);
  const managers = (employees ?? [])
    .filter((employee) => employee.status === "ACTIVE")
    .map((employee) => ({ id: employee.code, name: `${employee.name} (${employee.code})` }));
  return NextResponse.json({ departments, positions, jobLevels, managers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await canManageEmployees();
  if (!session) return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() : "");

  const firstName = text("firstName");
  const lastName = text("lastName");
  const email = text("email");
  const startDate = text("startDate");
  const birthDate = text("birthDate");
  const citizenId = text("citizenId");
  const nationality = text("nationality");
  const currentAddress = text("currentAddress");
  const department = text("department");
  const position = text("position");
  const gender = text("gender");
  const maritalStatus = text("maritalStatus");
  const childrenCount = text("childrenCount");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  if (!DATE_RE.test(startDate)) return invalid("startDate", "เลือกวันเริ่มงาน");
  if (!department) return invalid("department", "เลือกแผนก");
  if (!position) return invalid("position", "เลือกตำแหน่ง");
  if (!firstName) return invalid("firstName", "กรอกชื่อ");
  if (!lastName) return invalid("lastName", "กรอกนามสกุล");
  if (!/^\d{13}$/.test(citizenId)) return invalid("citizenId", "กรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
  if (!DATE_RE.test(birthDate)) return invalid("birthDate", "เลือกวันเกิด");
  if (birthDate > today) return invalid("birthDate", "วันเกิดต้องไม่เป็นวันในอนาคต");
  if (birthDate >= startDate) return invalid("birthDate", "วันเกิดต้องอยู่ก่อนวันเริ่มงาน");
  if (!nationality) return invalid("nationality", "กรอกสัญชาติ");
  if (!GENDERS.includes(gender)) return invalid("gender", "เลือกเพศ");
  if (!MARITAL_STATUSES.includes(maritalStatus)) return invalid("maritalStatus", "เลือกสถานะสมรส");
  if (!/^[0-2]$/.test(childrenCount)) return invalid("childrenCount", "จำนวนบุตรที่เบิกได้สูงสุด 2 คน (0–2)");
  if (!EMAIL_RE.test(email)) return invalid("email", "รูปแบบอีเมลไม่ถูกต้อง เช่น name@company.co.th");
  if (!currentAddress) return invalid("currentAddress", "กรอกที่อยู่");
  const postalCode = text("postalCode");
  if (postalCode && !/^\d{5}$/.test(postalCode)) return invalid("postalCode", "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");

  try {
    const options = await getOrgOptions();
    if (!options.departments.some((item) => item.id === department)) return invalid("department", "แผนกที่เลือกไม่มีในระบบ");
    if (!options.positions.some((item) => item.id === position)) return invalid("position", "ตำแหน่งที่เลือกไม่มีในระบบ");
    const jobLevel = text("jobLevel");
    if (jobLevel && !options.jobLevels.some((item) => item.id === jobLevel)) return invalid("jobLevel", "ระดับที่เลือกไม่มีในระบบ");
    const managerCode = text("managerCode");
    const managerId = managerCode ? await findEmployeeUuidByCode(managerCode) : null;
    if (managerCode && !managerId) return invalid("managerCode", "ไม่พบพนักงานที่เลือกเป็นหัวหน้า");

    const prefix = text("prefix");
    const code = await createHrEmployee({
      title_th: PREFIXES.includes(prefix) ? prefix : null,
      first_name_th: firstName,
      last_name_th: lastName,
      first_name_en: text("firstNameEn") || null,
      last_name_en: text("lastNameEn") || null,
      nickname: text("nickname") || null,
      email,
      phone: text("phone") || null,
      emergency_contact_name: text("emergencyContactName") || null,
      emergency_contact_phone: text("emergencyContactPhone") || null,
      address_line: currentAddress,
      subdistrict: text("subdistrict") || null,
      district: text("district") || null,
      province: text("province") || null,
      postal_code: postalCode || null,
      department_id: department,
      position_id: position,
      job_level_id: jobLevel || null,
      manager_employee_id: managerId,
      hire_date: startDate,
      gender,
      nationality,
      citizen_id: citizenId,
      birth_date: birthDate,
      religion: text("religion") || null,
      marital_status: maritalStatus,
      children_count: Number(childrenCount),
      father_first_name: text("fatherFirstName") || null,
      father_last_name: text("fatherLastName") || null,
      mother_first_name: text("motherFirstName") || null,
      mother_last_name: text("motherLastName") || null,
    });

    const name = `${firstName} ${lastName}`;
    // ไม่เก็บเลขบัตรประชาชนใน log
    await writeAudit({
      action: "EMPLOYEE_CREATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: code,
      detail: `เพิ่มพนักงาน ${name}`,
    });
    return NextResponse.json({ ok: true, code, name }, { status: 201 });
  } catch (err) {
    const pg = err as { code?: string; message?: string };
    if (pg?.code === "23505") {
      return pg.message?.includes("citizen_id")
        ? invalid("citizenId", "เลขบัตรประชาชนนี้มีในระบบแล้ว", 409)
        : invalid("email", "อีเมลนี้มีในระบบแล้ว", 409);
    }
    console.error("Error creating employee:", err);
    if (pg?.code === "P0001" && pg.message) return NextResponse.json({ error: pg.message }, { status: 400 });
    if (pg?.code === "23514") return NextResponse.json({ error: "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });
    return NextResponse.json({ error: "บันทึกพนักงานไม่สำเร็จ ข้อมูลยังไม่เข้าระบบ กรุณาลองอีกครั้ง" }, { status: 500 });
  }
}
