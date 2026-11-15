import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { findEmployeeUuidByCode } from "@/lib/auth/users";

// คำขอแก้ไขข้อมูลพนักงาน (ดีไซน์ H12) ตาราง employee_edit_request
//   พนักงานขอแก้ข้อมูลส่วนตัว -> HR คนอื่นตรวจ -> อนุมัติ = บันทึกค่าใหม่ลง employee จริง / ไม่อนุมัติ = ต้องมีข้อความถึงพนักงาน

/** ช่องของ employee ที่ขอแก้ได้ (ช่องที่ระบบหรือ HR กำหนด เช่น แผนก ตำแหน่ง สถานะ ขอแก้ไม่ได้) */
export const EDITABLE_FIELDS: Record<string, string> = {
  title_th: "คำนำหน้า",
  first_name_th: "ชื่อ",
  last_name_th: "นามสกุล",
  first_name_en: "ชื่อ (อังกฤษ)",
  last_name_en: "นามสกุล (อังกฤษ)",
  nickname: "ชื่อเล่น",
  phone: "โทรศัพท์",
  emergency_contact_name: "ผู้ติดต่อฉุกเฉิน",
  emergency_contact_phone: "โทรศัพท์ผู้ติดต่อฉุกเฉิน",
  address_line: "ที่อยู่",
  subdistrict: "แขวง/ตำบล",
  district: "เขต/อำเภอ",
  province: "จังหวัด",
  postal_code: "รหัสไปรษณีย์",
  religion: "ศาสนา",
  marital_status: "สถานภาพสมรส",
  children_count: "จำนวนบุตร",
};

export class EditRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type Change = { old: unknown; new: unknown };

export type EditRequestItem = {
  id: string;
  employeeCode: string;
  employeeName: string;
  /** รหัส · ตำแหน่ง · แผนก */
  line: string;
  submittedAt: string;
  reason: string;
  changes: { field: string; label: string; old: string; new: string }[];
};

type Person = { employee_code: string; first_name_th: string; last_name_th: string; position: { name_th: string } | null; department: { name_th: string } | null } | null;
type Row = { id: string; submitted_at: string; reason: string; requested_fields: Record<string, Change>; employee: Person };

const show = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));
const nameOf = (person: Person) => (person ? `${person.first_name_th} ${person.last_name_th === "-" ? "" : person.last_name_th}`.trim() : "—");

/** คำขอที่รอ HR ตรวจ เก่าสุดก่อน (null = โหลดไม่สำเร็จ) */
export async function listPendingEditRequests(): Promise<EditRequestItem[] | null> {
  const { data, error } = await supabaseAdmin
    .from("employee_edit_request")
    .select("id, submitted_at, reason, requested_fields, employee:employee_id(employee_code, first_name_th, last_name_th, position:position_id(name_th), department:department_id(name_th))")
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true })
    .returns<Row[]>();
  if (error) {
    console.error("[hr edit requests] load failed", error);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    employeeCode: row.employee?.employee_code ?? "",
    employeeName: nameOf(row.employee),
    line: [row.employee?.employee_code, row.employee?.position?.name_th, row.employee?.department?.name_th].filter(Boolean).join(" · "),
    submittedAt: row.submitted_at,
    reason: row.reason,
    changes: Object.entries(row.requested_fields ?? {}).map(([field, change]) => ({ field, label: EDITABLE_FIELDS[field] ?? field, old: show(change?.old), new: show(change?.new) })),
  }));
}

export async function countPendingEditRequests(): Promise<number> {
  const { count } = await supabaseAdmin.from("employee_edit_request").select("id", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null);
  return count ?? 0;
}

/** HR ตัดสินคำขอ: อนุมัติ = บันทึกค่าใหม่ลง employee แล้วปิดคำขอ คืนรหัสพนักงานและช่องที่เปลี่ยนไว้เขียน Log */
export async function decideEditRequest(id: string, decision: "approve" | "reject", note: string, actorCode: string) {
  const actorId = await findEmployeeUuidByCode(actorCode);
  if (!actorId) throw new EditRequestError("ไม่พบผู้ใช้", 403);
  const { data: request, error } = await supabaseAdmin
    .from("employee_edit_request")
    .select("id, status, employee_id, requested_fields, employee:employee_id(employee_code)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; status: string; employee_id: string; requested_fields: Record<string, Change>; employee: { employee_code: string } | null }>();
  if (error) throw error;
  if (!request) throw new EditRequestError("ไม่พบคำขอนี้", 404);
  if (request.status !== "pending") throw new EditRequestError("คำขอนี้ตัดสินไปแล้ว", 409);
  if (request.employee_id === actorId) throw new EditRequestError("ตัดสินคำขอแก้ไขข้อมูลของตัวเองไม่ได้ ต้องให้ HR คนอื่นตรวจ", 403);
  if (decision === "reject" && !note.trim()) throw new EditRequestError("ระบุข้อความถึงพนักงานเมื่อไม่อนุมัติ");

  const changes: Record<string, Change> = {};
  if (decision === "approve") {
    const update: Record<string, unknown> = {};
    for (const [field, change] of Object.entries(request.requested_fields ?? {})) {
      if (!(field in EDITABLE_FIELDS)) throw new EditRequestError(`ช่อง ${field} ขอแก้ไม่ได้`);
      update[field] = field === "children_count" ? Number(change.new) : change.new === "" ? null : change.new;
      changes[field] = { old: change.old, new: change.new };
    }
    const { error: updateError } = await supabaseAdmin.from("employee").update(update).eq("id", request.employee_id);
    if (updateError) throw updateError;
  }
  const { error: decideError } = await supabaseAdmin
    .from("employee_edit_request")
    .update({ status: decision === "approve" ? "approved" : "rejected", decided_by: actorId, decided_at: new Date().toISOString(), decision_note: note.trim() || null })
    .eq("id", id)
    .eq("status", "pending");
  if (decideError) throw decideError;
  return { employeeCode: request.employee?.employee_code ?? "", changes };
}
