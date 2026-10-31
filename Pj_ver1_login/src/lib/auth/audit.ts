import { supabaseAdmin } from "../supabase";

/**
 * Audit Log (NFR09): บันทึกว่าใครทำอะไรเมื่อไร จากที่ไหน
 * เก็บใน Supabase table `audit_logs`
 */
export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_BLOCKED_LOCKED"
  | "LOGIN_BLOCKED_RECAPTCHA"
  | "LOGIN_BLOCKED_INACTIVE"
  | "LOGOUT"
  | "USER_UPDATE";

/** เฉพาะคอลัมน์ที่เปลี่ยน: { คอลัมน์: { old, new } } */
export type AuditChanges = Record<string, { old: unknown; new: unknown }>;

export interface AuditEntry {
  id?: string;
  at: string;
  action: AuditAction;
  userId: string | null;
  identifier?: string;
  ip: string | null;
  detail?: string;
  targetId?: string;
  changes?: AuditChanges;
  reason?: string;
}

export async function writeAudit(e: Omit<AuditEntry, "at" | "id">): Promise<void> {
  const at = new Date().toISOString();
  console.log("[AUDIT]", JSON.stringify({ at, ...e }));

  try {
    const { error } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        action: e.action,
        user_id: e.userId,
        identifier: e.identifier,
        ip_address: e.ip,
        details: e.detail,
        target_id: e.targetId,
        changes: e.changes,
        reason: e.reason,
        created_at: at
      });
    if (error) throw error;
  } catch (err) {
    // การบันทึก log พลาดต้องไม่ทำให้การล็อกอินล้ม
    console.error("[AUDIT] write failed", err);
  }
}

export async function listAudit(limit = 500): Promise<AuditEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data.map((row) => ({
        id: String(row.id),
        at: row.created_at,
        action: row.action as AuditAction,
        userId: row.user_id,
        identifier: row.identifier ?? undefined,
        ip: row.ip_address,
        detail: row.details ?? undefined,
        targetId: row.target_id ?? undefined,
        changes: row.changes ?? undefined,
        reason: row.reason ?? undefined
      }));
    }
    if (error) console.error("Supabase listAudit error", error);
  } catch (err) {
    console.error("Supabase listAudit error", err);
  }
  return [];
}
