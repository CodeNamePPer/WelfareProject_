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
  | "LOGOUT";

export interface AuditEntry {
  at: string;
  action: AuditAction;
  userId: string | null;
  identifier?: string;
  ip: string | null;
  detail?: string;
}

export async function writeAudit(e: Omit<AuditEntry, "at">): Promise<void> {
  const at = new Date().toISOString();
  console.log("[AUDIT]", JSON.stringify({ at, ...e }));
  
  try {
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        action: e.action,
        user_id: e.userId,
        identifier: e.identifier,
        ip_address: e.ip,
        details: e.detail,
        created_at: at
      });
  } catch (err) {
    // การบันทึก log พลาดต้องไม่ทำให้การล็อกอินล้ม
    console.error("[AUDIT] write failed", err);
  }
}

export async function listAudit(): Promise<AuditEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      return data.map((row) => ({
        at: row.created_at,
        action: row.action as AuditAction,
        userId: row.user_id,
        identifier: row.identifier ?? undefined,
        ip: row.ip_address,
        detail: row.details ?? undefined
      }));
    }
  } catch (err) {
    console.error("Supabase listAudit error", err);
  }
  return [];
}
