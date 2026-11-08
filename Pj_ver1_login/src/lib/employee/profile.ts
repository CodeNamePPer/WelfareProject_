import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "../supabase";
import { employmentStatusLabel } from "../employmentStatus";

export type EmployeeNameParts = { title_th: string | null; first_name_th: string; last_name_th: string };

/** บัญชีบางคนไม่มีนามสกุลจริง เก็บเป็น "-" จึงไม่นำมาแสดง */
export function employeeFullName({ title_th, first_name_th, last_name_th }: EmployeeNameParts): string {
  const last = last_name_th.trim();
  return `${title_th ?? ""}${first_name_th.trim()}${last && last !== "-" ? ` ${last}` : ""}`.trim();
}

export interface MyProfile {
  code: string;
  name: string;
  initials: string;
  statusLabel: string;
  department: string | null;
  position: string | null;
  /** วันเริ่มงานแบบพร้อมแสดง เช่น 1 มีนาคม 2565 */
  hireDate: string;
  email: string;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  lastEdit: { at: string; editorName: string | null; editorPosition: string | null; reason: string | null } | null;
}

interface ProfileRow extends EmployeeNameParts {
  employee_code: string;
  email: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_line: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  employment_status: string;
  hire_date: string;
  department: { name_th: string } | null;
  position: { name_th: string } | null;
}

const TZ = "Asia/Bangkok";

function joinParts(parts: (string | null)[], separator: string): string | null {
  return parts.map((part) => part?.trim()).filter(Boolean).join(separator) || null;
}

/** ตัวอักษรแรกของชื่อและนามสกุล ข้ามสระหน้า เช่น เ แ โ */
function initialsOf(row: EmployeeNameParts): string {
  const first = (text: string) => text.match(/[ก-ฮA-Za-z]/)?.[0] ?? "";
  return first(row.first_name_th) + (row.last_name_th.trim() === "-" ? "" : first(row.last_name_th));
}

/** การแก้ไขล่าสุดจาก audit_logs – โหลดไม่ได้ก็ยังแสดงโปรไฟล์ได้ */
async function fetchLastEdit(code: string): Promise<MyProfile["lastEdit"]> {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("user_id, reason, created_at")
    .eq("action", "USER_UPDATE")
    .eq("target_id", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[employee] load last profile edit failed", error);
    return null;
  }
  if (!data) return null;

  const { data: editor } = data.user_id
    ? await supabaseAdmin
        .from("employee")
        .select("title_th, first_name_th, last_name_th, position:position_id(name_th)")
        .eq("employee_code", data.user_id)
        .maybeSingle()
        .returns<(EmployeeNameParts & { position: { name_th: string } | null }) | null>()
    : { data: null };

  return {
    at: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(new Date(data.created_at)),
    editorName: editor ? employeeFullName(editor) : null,
    editorPosition: editor?.position?.name_th ?? null,
    reason: data.reason,
  };
}

/**
 * โปรไฟล์ของผู้ที่ล็อกอิน (code = session.sub)
 * คืน null เมื่อโหลดไม่สำเร็จ เพื่อให้หน้าจอแจ้งตามจริงแทนการแสดงข้อมูลปลอม
 */
export const getMyProfile = cache(async (code: string): Promise<MyProfile | null> => {
  try {
    const [{ data, error }, lastEdit] = await Promise.all([
      supabaseAdmin
        .from("employee")
        .select(
          `employee_code, title_th, first_name_th, last_name_th, email, phone,
           emergency_contact_name, emergency_contact_phone,
           address_line, subdistrict, district, province, postal_code,
           employment_status, hire_date,
           department:department_id(name_th), position:position_id(name_th)`,
        )
        .eq("employee_code", code)
        .is("deleted_at", null)
        .maybeSingle()
        .returns<ProfileRow | null>(),
      fetchLastEdit(code),
    ]);
    if (error) throw error;
    if (!data) return null;

    return {
      code: data.employee_code,
      name: employeeFullName(data),
      initials: initialsOf(data),
      statusLabel: employmentStatusLabel(data.employment_status.toUpperCase()),
      department: data.department?.name_th ?? null,
      position: data.position?.name_th ?? null,
      hireDate: new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: TZ }).format(new Date(`${data.hire_date}T00:00:00+07:00`)),
      email: data.email,
      phone: data.phone,
      address: joinParts([data.address_line, data.subdistrict, data.district, data.province, data.postal_code], " "),
      emergencyContact: joinParts([data.emergency_contact_name, data.emergency_contact_phone], " · "),
      lastEdit,
    };
  } catch (err) {
    console.error("[employee] load profile failed", err);
    return null;
  }
});
