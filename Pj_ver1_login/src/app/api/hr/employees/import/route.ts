import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { getOrgOptions } from "@/lib/auth/users";
import { createHrEmployees } from "@/lib/hr/employees";
import {
  MAX_CSV_IMPORT_ROWS,
  validateEmployeeCsvRows,
  type ActiveManagerRef,
  type EmployeeCsvRowInput,
} from "@/lib/hr/employeeCsv";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInputRow(raw: unknown, index: number): EmployeeCsvRowInput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const rowNumber =
    typeof obj.rowNumber === "number" && Number.isInteger(obj.rowNumber) && obj.rowNumber >= 2
      ? obj.rowNumber
      : index + 2;

  return {
    rowNumber,
    prefix: asText(obj.prefix),
    firstName: asText(obj.firstName),
    lastName: asText(obj.lastName),
    firstNameEn: asText(obj.firstNameEn),
    lastNameEn: asText(obj.lastNameEn),
    nickname: asText(obj.nickname),
    gender: asText(obj.gender),
    birthDate: asText(obj.birthDate),
    citizenId: asText(obj.citizenId),
    nationality: asText(obj.nationality),
    religion: asText(obj.religion),
    maritalStatus: asText(obj.maritalStatus),
    childrenCount: asText(obj.childrenCount),
    startDate: asText(obj.startDate),
    department: asText(obj.department),
    position: asText(obj.position),
    jobLevel: asText(obj.jobLevel),
    managerCode: asText(obj.managerCode),
    email: asText(obj.email),
    phone: asText(obj.phone),
    emergencyContactName: asText(obj.emergencyContactName),
    emergencyContactPhone: asText(obj.emergencyContactPhone),
    currentAddress: asText(obj.currentAddress),
    subdistrict: asText(obj.subdistrict),
    district: asText(obj.district),
    province: asText(obj.province),
    postalCode: asText(obj.postalCode),
    fatherFirstName: asText(obj.fatherFirstName),
    fatherLastName: asText(obj.fatherLastName),
    motherFirstName: asText(obj.motherFirstName),
    motherLastName: asText(obj.motherLastName),
  };
}

interface ExistingEmployeeDbRow {
  id: string;
  employee_code: string;
  title_th: string | null;
  first_name_th: string;
  last_name_th: string;
  email: string;
  citizen_id: string | null;
  employment_status: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  let body: { rows?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "ไม่พบข้อมูลพนักงานสำหรับนำเข้า" }, { status: 400 });
  }

  if (body.rows.length > MAX_CSV_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `นำเข้าได้สูงสุดครั้งละ ${MAX_CSV_IMPORT_ROWS} คน` },
      { status: 400 },
    );
  }

  const rows: EmployeeCsvRowInput[] = [];
  for (let i = 0; i < body.rows.length; i += 1) {
    const normalized = normalizeInputRow(body.rows[i], i);
    if (!normalized) {
      return NextResponse.json({ error: `รูปแบบข้อมูลแถวที่ ${i + 2} ไม่ถูกต้อง` }, { status: 400 });
    }
    rows.push(normalized);
  }

  const dryRun = body.dryRun === true;

  try {
    const [org, employeeRes] = await Promise.all([
      getOrgOptions(),
      supabaseAdmin
        .from("employee")
        .select("id, employee_code, title_th, first_name_th, last_name_th, email, citizen_id, employment_status")
        .is("deleted_at", null)
        .returns<ExistingEmployeeDbRow[]>(),
    ]);

    if (employeeRes.error) throw employeeRes.error;
    const existing = employeeRes.data ?? [];

    const existingEmails = new Set<string>();
    const existingCitizenIds = new Set<string>();
    const managers: ActiveManagerRef[] = [];

    for (const emp of existing) {
      if (emp.email) existingEmails.add(emp.email.trim().toLowerCase());
      if (emp.citizen_id) existingCitizenIds.add(emp.citizen_id.trim());
      if (emp.employment_status === "active") {
        const last = emp.last_name_th === "-" ? "" : emp.last_name_th;
        const name = `${emp.title_th ?? ""}${emp.first_name_th} ${last}`.trim();
        managers.push({ id: emp.id, code: emp.employee_code, name });
      }
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const validated = validateEmployeeCsvRows(rows, {
      org,
      managers,
      existingEmails,
      existingCitizenIds,
      today,
    });

    const results = validated.map((item) => item.preview);
    const validCount = results.filter((item) => item.valid).length;
    const invalidCount = results.length - validCount;

    if (dryRun) {
      return NextResponse.json(
        { ok: invalidCount === 0, dryRun: true, validCount, invalidCount, results },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (invalidCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "มีข้อมูลบางแถวไม่ผ่านเงื่อนไข กรุณาแก้ไขไฟล์แล้วอัปโหลดใหม่",
          validCount,
          invalidCount,
          results,
        },
        { status: 400 },
      );
    }

    const payloads = validated.map((item) => item.record!);
    const created = await createHrEmployees(payloads);

    const ip = getClientIp(req.headers);
    const batchSize = 20;
    for (let i = 0; i < created.length; i += batchSize) {
      const slice = created.slice(i, i + batchSize);
      await Promise.all(
        slice.map((item) =>
          writeAudit({
            action: "EMPLOYEE_CREATE",
            userId: session.sub,
            ip,
            targetId: item.code,
            detail: `เพิ่มพนักงาน ${item.name} (นำเข้า CSV)`,
          }),
        ),
      );
    }

    return NextResponse.json({ ok: true, count: created.length, created }, { status: 201 });
  } catch (err) {
    const pg = err as { code?: string; message?: string };
    if (pg?.code === "23505") {
      return NextResponse.json(
        {
          error: pg.message?.includes("citizen_id")
            ? "พบเลขบัตรประชาชนซ้ำกับข้อมูลที่มีในระบบแล้ว ข้อมูลทั้งหมดยังไม่ถูกบันทึก"
            : "พบอีเมลซ้ำกับข้อมูลที่มีในระบบแล้ว ข้อมูลทั้งหมดยังไม่ถูกบันทึก",
        },
        { status: 409 },
      );
    }
    console.error("Error importing employees via CSV:", err);
    if (pg?.code === "P0001" && pg.message) {
      return NextResponse.json({ error: `${pg.message} (ข้อมูลทั้งหมดยังไม่ถูกบันทึก)` }, { status: 400 });
    }
    if (pg?.code === "23514") {
      return NextResponse.json(
        { error: "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบอีกครั้ง (ข้อมูลทั้งหมดยังไม่ถูกบันทึก)" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "นำเข้าพนักงานไม่สำเร็จ ข้อมูลทั้งหมดยังไม่เข้าระบบ กรุณาลองอีกครั้ง" },
      { status: 500 },
    );
  }
}
