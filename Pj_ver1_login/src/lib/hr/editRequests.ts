import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { findEmployeeUuidByCode } from "@/lib/auth/users";
import { emailHr } from "./emailNotify";

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

const EVIDENCE_BUCKET = "employee-edit-docs";
const EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

/** ข้อมูลที่พนักงานเลือกขอเปลี่ยนในฟอร์ม changeprofile (อีเมลเป็นชื่อเข้าระบบ จึงต้องให้ Admin เปลี่ยน) */
export type EmployeeChangeTopic = "phone" | "name" | "address";
export const EMPLOYEE_CHANGE_TOPICS: EmployeeChangeTopic[] = ["phone", "name", "address"];

/** คำขอที่ยังรอ HR ตรวจของพนักงานคนนี้ (มีได้ครั้งละ 1 คำขอ) */
export type MyPendingEditRequest = { submittedAt: string; labels: string[] };

export async function getMyPendingEditRequest(code: string): Promise<MyPendingEditRequest | null> {
  const employeeId = await findEmployeeUuidByCode(code);
  if (!employeeId) return null;
  const { data, error } = await supabaseAdmin
    .from("employee_edit_request")
    .select("submitted_at, requested_fields")
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .maybeSingle<{ submitted_at: string; requested_fields: Record<string, Change> }>();
  if (error) {
    console.error("[employee edit request] load pending failed", error);
    return null;
  }
  if (!data) return null;
  return { submittedAt: data.submitted_at, labels: Object.keys(data.requested_fields ?? {}).map((field) => EDITABLE_FIELDS[field] ?? field) };
}

/** พนักงานยื่นคำขอเปลี่ยนข้อมูลของตัวเอง 1 เรื่องต่อคำขอ พร้อมหลักฐาน 1 ไฟล์ */
export async function submitEmployeeEditRequest(code: string, topic: EmployeeChangeTopic, value: string, reason: string, evidence: File) {
  const next = value.trim();
  if (!next) throw new EditRequestError("ระบุค่าใหม่ที่ต้องการ");
  if (!reason.trim()) throw new EditRequestError("ระบุเหตุผลในการขอเปลี่ยนข้อมูล");
  if (reason.trim().length > 500) throw new EditRequestError("เหตุผลยาวเกิน 500 ตัวอักษร");
  if (!EVIDENCE_TYPES.includes(evidence.type)) throw new EditRequestError("ไฟล์หลักฐานต้องเป็น PDF, JPG หรือ PNG");
  if (evidence.size > EVIDENCE_MAX_BYTES) throw new EditRequestError("ไฟล์หลักฐานมีขนาดเกิน 10 MB");

  const { data: me, error } = await supabaseAdmin
    .from("employee")
    .select("id, phone, first_name_th, last_name_th, address_line")
    .eq("employee_code", code)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; phone: string | null; first_name_th: string; last_name_th: string; address_line: string | null }>();
  if (error) throw error;
  if (!me) throw new EditRequestError("ไม่พบข้อมูลพนักงาน", 404);

  const changes: Record<string, { old: string | null; new: string }> = {};
  if (topic === "phone") {
    if (!/^[0-9+\-\s()]{9,20}$/.test(next)) throw new EditRequestError("เบอร์โทรศัพท์ไม่ถูกต้อง");
    if (next !== (me.phone ?? "")) changes.phone = { old: me.phone, new: next };
  } else if (topic === "name") {
    const [first, ...rest] = next.split(/\s+/);
    // บัญชีที่ไม่มีนามสกุลเก็บเป็น "-" ตามข้อมูลเดิมในระบบ
    const last = rest.join(" ") || "-";
    if (first !== me.first_name_th) changes.first_name_th = { old: me.first_name_th, new: first };
    if (last !== me.last_name_th) changes.last_name_th = { old: me.last_name_th, new: last };
  } else {
    if (next !== (me.address_line ?? "")) changes.address_line = { old: me.address_line, new: next };
  }
  if (Object.keys(changes).length === 0) throw new EditRequestError("ค่าใหม่ตรงกับข้อมูลเดิมในโปรไฟล์");

  const ext = evidence.type === "application/pdf" ? ".pdf" : evidence.type === "image/png" ? ".png" : ".jpg";
  const evidencePath = `${me.id}/${crypto.randomUUID()}${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).upload(evidencePath, evidence, { contentType: evidence.type });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabaseAdmin.from("employee_edit_request").insert({
    employee_id: me.id,
    requested_by: me.id,
    requested_fields: changes,
    reason: reason.trim(),
    evidence_path: evidencePath,
    evidence_name: evidence.name.slice(0, 200),
    evidence_mime: evidence.type,
  });
  if (insertError) {
    // ไม่ให้ไฟล์ค้างใน bucket เมื่อบันทึกคำขอไม่ได้
    await supabaseAdmin.storage.from(EVIDENCE_BUCKET).remove([evidencePath]);
    if (insertError.code === "23505") throw new EditRequestError("มีคำขอเปลี่ยนข้อมูลที่รอฝ่ายบุคคลตรวจอยู่แล้ว รอผลก่อนจึงส่งคำขอใหม่ได้", 409);
    throw insertError;
  }
  emailHr(
    "employee_edit_request",
    { subject: `คำขอแก้ไขข้อมูลพนักงาน ${code}`, lines: [`${code} ขอเปลี่ยน ${Object.keys(changes).map((field) => EDITABLE_FIELDS[field] ?? field).join(", ")}`], path: "/hr/employees/requests" },
    { exclude: [code] },
  );
}

/** ลิงก์ชั่วคราว (60 วินาที) ให้ HR เปิดดูหลักฐานของคำขอ */
export async function getEditRequestEvidenceUrl(id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("employee_edit_request")
    .select("evidence_path")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<{ evidence_path: string | null }>();
  if (error) throw error;
  if (!data?.evidence_path) return null;
  const signed = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).createSignedUrl(data.evidence_path, 60);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

export type EditRequestItem = {
  id: string;
  employeeCode: string;
  employeeName: string;
  /** รหัส · ตำแหน่ง · แผนก */
  line: string;
  submittedAt: string;
  reason: string;
  /** ชื่อไฟล์หลักฐานที่แนบ (null = ไม่มี) */
  evidenceName: string | null;
  changes: { field: string; label: string; old: string; new: string }[];
};

type Person = { employee_code: string; first_name_th: string; last_name_th: string; position: { name_th: string } | null; department: { name_th: string } | null } | null;
type Row = { id: string; submitted_at: string; reason: string; evidence_name: string | null; requested_fields: Record<string, Change>; employee: Person };

const show = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));
const nameOf = (person: Person) => (person ? `${person.first_name_th} ${person.last_name_th === "-" ? "" : person.last_name_th}`.trim() : "—");

/** คำขอที่รอ HR ตรวจ เก่าสุดก่อน (null = โหลดไม่สำเร็จ) */
export async function listPendingEditRequests(): Promise<EditRequestItem[] | null> {
  const { data, error } = await supabaseAdmin
    .from("employee_edit_request")
    .select("id, submitted_at, reason, evidence_name, requested_fields, employee:employee_id(employee_code, first_name_th, last_name_th, position:position_id(name_th), department:department_id(name_th))")
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
    evidenceName: row.evidence_name,
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
