import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// ข้อมูลเพิ่มของหน้าโปรไฟล์ HR / หัวหน้า HR (ดีไซน์ P01, P02) อ่านอย่างเดียว

export type HrProfileExtras = {
  loginEmail: string | null;
  /** วันเริ่มงาน YYYY-MM-DD */
  hireDate: string | null;
  /** จำนวนลูกน้องโดยตรงที่ยังทำงานอยู่ */
  directReports: number;
  /** เป็นหัวหน้าของแผนกใดแผนกหนึ่ง */
  departmentHead: boolean;
  /** วันที่ได้รับบทบาท HR (ISO) */
  hrGrantedAt: string | null;
  /** การตรวจคำขอของเดือนนี้ */
  review: { total: number; approved: number; returned: number; rejected: number; averageDays: number | null };
  /** สำหรับหัวหน้า HR */
  proposals: { pending: number; fromHr: number; fromAdmin: number; approvedThisYear: number; activeBenefits: number };
  logins: { at: string; ip: string | null }[];
};

const TZ = "Asia/Bangkok";

export async function getHrProfileExtras(code: string): Promise<HrProfileExtras | null> {
  try {
    const { data: me, error } = await supabaseAdmin.from("employee").select("id, hire_date").eq("employee_code", code).is("deleted_at", null).maybeSingle();
    if (error || !me) throw error ?? new Error("employee not found");
    const id = me.id as string;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
    const monthStart = `${today.slice(0, 7)}-01T00:00:00+07:00`;
    const yearStart = `${today.slice(0, 4)}-01-01T00:00:00+07:00`;

    const [account, reports, headOf, role, events, pending, approved, active, logins] = await Promise.all([
      supabaseAdmin.from("v_app_user").select("email").eq("employee_id", code).maybeSingle(),
      supabaseAdmin.from("employee").select("id", { count: "exact", head: true }).eq("manager_employee_id", id).eq("employment_status", "active").is("deleted_at", null),
      supabaseAdmin.from("department").select("id", { count: "exact", head: true }).eq("head_employee_id", id).is("deleted_at", null),
      supabaseAdmin.from("user_role").select("granted_at, role:role_id!inner(code)").eq("employee_id", id).eq("role.code", "HR").is("revoked_at", null).limit(1),
      supabaseAdmin
        .from("welfare_claim_event")
        .select("claim_id, kind, created_at")
        .eq("actor_employee_id", id)
        .in("kind", ["hr_approved", "revision_requested", "rejected"])
        .gte("created_at", monthStart)
        .returns<{ claim_id: string; kind: string; created_at: string }[]>(),
      supabaseAdmin.from("welfare_benefit_proposal").select("proposer_role").eq("status", "pending").is("deleted_at", null),
      supabaseAdmin.from("welfare_benefit_proposal").select("id", { count: "exact", head: true }).eq("status", "approved").gte("decided_at", yearStart).is("deleted_at", null),
      supabaseAdmin.from("welfare_benefit").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
      supabaseAdmin.from("audit_logs").select("created_at, ip_address").eq("action", "LOGIN_SUCCESS").eq("user_id", code).order("created_at", { ascending: false }).limit(3),
    ]);

    // เวลาตรวจเฉลี่ย: จากครั้งที่ยื่น/ยื่นใหม่ล่าสุดก่อนการตัดสิน ถึงเวลาที่ตัดสิน
    const decided = events.data ?? [];
    let averageDays: number | null = null;
    if (decided.length > 0) {
      const { data: submits } = await supabaseAdmin
        .from("welfare_claim_event")
        .select("claim_id, created_at")
        .in("claim_id", [...new Set(decided.map((event) => event.claim_id))])
        .in("kind", ["submitted", "resubmitted"])
        .returns<{ claim_id: string; created_at: string }[]>();
      const waits = decided.flatMap((event) => {
        const before = (submits ?? []).filter((item) => item.claim_id === event.claim_id && item.created_at <= event.created_at).map((item) => item.created_at);
        if (before.length === 0) return [];
        const start = before.reduce((max, value) => (value > max ? value : max));
        return [(new Date(event.created_at).getTime() - new Date(start).getTime()) / 86_400_000];
      });
      if (waits.length > 0) averageDays = waits.reduce((sum, value) => sum + value, 0) / waits.length;
    }
    const count = (kind: string) => decided.filter((event) => event.kind === kind).length;
    const pendingRows = (pending.data ?? []) as { proposer_role: string }[];

    return {
      loginEmail: (account.data?.email as string | undefined) ?? null,
      hireDate: (me.hire_date as string | null) ?? null,
      directReports: reports.count ?? 0,
      departmentHead: (headOf.count ?? 0) > 0,
      hrGrantedAt: (role.data?.[0]?.granted_at as string | undefined) ?? null,
      review: { total: decided.length, approved: count("hr_approved"), returned: count("revision_requested"), rejected: count("rejected"), averageDays },
      proposals: {
        pending: pendingRows.length,
        fromHr: pendingRows.filter((row) => row.proposer_role === "HR").length,
        fromAdmin: pendingRows.filter((row) => row.proposer_role === "SUPER_ADMIN").length,
        approvedThisYear: approved.count ?? 0,
        activeBenefits: active.count ?? 0,
      },
      logins: (logins.data ?? []).map((row) => ({ at: row.created_at as string, ip: (row.ip_address as string | null) ?? null })),
    };
  } catch (err) {
    console.error("[hr profile] load failed", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// ข้อมูลส่วนตัว การตั้งค่าแจ้งเตือน และคำขอแก้ไขข้อมูลของตัวเอง (P01/P02)
// -----------------------------------------------------------------------------

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = { permanent: "พนักงานประจำ", probation: "ทดลองงาน", contract: "สัญญาจ้าง", part_time: "ไม่เต็มเวลา" };

/** ช่องติดต่อที่ขอแก้ได้จากหน้าโปรไฟล์ (ส่งเป็นคำขอให้ HR คนอื่นตรวจ) */
export const CONTACT_FIELDS = ["phone", "emergency_contact_name", "emergency_contact_phone", "address_line"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ProfileSettings = {
  employmentType: string | null;
  contact: Record<ContactField, string>;
  maritalStatus: string | null;
  childrenCount: number | null;
  /** มีคำขอแก้ไขข้อมูลที่รอตรวจอยู่ (ยื่นเพิ่มไม่ได้จนกว่าจะตัดสิน) */
  pendingEditRequest: boolean;
  /** topic -> { inApp, email } (ไม่มี = แจ้งในระบบ ไม่ส่งอีเมล) */
  notifications: Record<string, { inApp: boolean; email: boolean }>;
};

export async function getProfileSettings(code: string): Promise<ProfileSettings | null> {
  const { data: me, error } = await supabaseAdmin
    .from("employee")
    .select("id, employment_type, phone, emergency_contact_name, emergency_contact_phone, address_line, marital_status, children_count")
    .eq("employee_code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !me) return null;
  const [pending, prefs] = await Promise.all([
    supabaseAdmin.from("employee_edit_request").select("id", { count: "exact", head: true }).eq("employee_id", me.id).eq("status", "pending").is("deleted_at", null),
    supabaseAdmin.from("hr_notification_preference").select("topic, in_app, email").eq("employee_id", me.id),
  ]);
  return {
    employmentType: me.employment_type ? (EMPLOYMENT_TYPE_LABEL[me.employment_type as string] ?? (me.employment_type as string)) : null,
    contact: Object.fromEntries(CONTACT_FIELDS.map((field) => [field, ((me as Record<string, unknown>)[field] as string | null) ?? ""])) as Record<ContactField, string>,
    maritalStatus: (me.marital_status as string | null) ?? null,
    childrenCount: (me.children_count as number | null) ?? null,
    pendingEditRequest: (pending.count ?? 0) > 0,
    notifications: Object.fromEntries((prefs.data ?? []).map((row) => [row.topic as string, { inApp: row.in_app as boolean, email: row.email as boolean }])),
  };
}

export class ProfileError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** ยื่นคำขอแก้ไขข้อมูลติดต่อของตัวเอง เก็บค่าเดิมไว้ด้วยเพื่อให้ HR เห็นก่อน → หลัง (H12) */
export async function submitOwnEditRequest(code: string, wanted: Partial<Record<ContactField, string>>, reason: string) {
  if (!reason.trim()) throw new ProfileError("ระบุเหตุผลที่ขอแก้ไข");
  const { data: me, error } = await supabaseAdmin.from("employee").select(`id, ${CONTACT_FIELDS.join(", ")}`).eq("employee_code", code).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!me) throw new ProfileError("ไม่พบข้อมูลพนักงาน", 404);
  const current = me as unknown as Record<string, string | null> & { id: string };
  const changes: Record<string, { old: string | null; new: string }> = {};
  for (const field of CONTACT_FIELDS) {
    const next = wanted[field]?.trim();
    if (next === undefined) continue;
    if (next !== (current[field] ?? "")) changes[field] = { old: current[field] ?? null, new: next };
  }
  if (Object.keys(changes).length === 0) throw new ProfileError("ยังไม่ได้เปลี่ยนข้อมูล");
  const { error: insertError } = await supabaseAdmin
    .from("employee_edit_request")
    .insert({ employee_id: current.id, requested_by: current.id, requested_fields: changes, reason: reason.trim() });
  if (insertError) {
    if (insertError.code === "23505") throw new ProfileError("มีคำขอแก้ไขข้อมูลที่รอตรวจอยู่แล้ว รอให้ HR ตรวจก่อน", 409);
    throw insertError;
  }
}

/** บันทึกการตั้งค่าแจ้งเตือนรายเรื่อง */
export async function saveNotificationPreferences(code: string, prefs: { topic: string; inApp: boolean; email: boolean }[]) {
  const { data: me } = await supabaseAdmin.from("employee").select("id").eq("employee_code", code).is("deleted_at", null).maybeSingle();
  if (!me) throw new ProfileError("ไม่พบข้อมูลพนักงาน", 404);
  const rows = prefs.filter((pref) => pref.topic.trim()).map((pref) => ({ employee_id: me.id, topic: pref.topic.trim(), in_app: pref.inApp, email: pref.email }));
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from("hr_notification_preference").upsert(rows, { onConflict: "employee_id,topic" });
  if (error) throw error;
}
