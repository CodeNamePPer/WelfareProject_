import "server-only";
import { supabaseAdmin } from "../supabase";
import { findEmployeeUuidByCode } from "../auth/users";

// สถานะอ่านแล้วของแจ้งเตือนพนักงาน: เก็บเวลาที่อ่านล่าสุดต่อคนในตาราง employee_notification_seen
// แจ้งเตือนคือ welfare_claim_event ของคำขอที่เป็นของพนักงาน ยังไม่อ่าน = เกิดหลัง seen_at และคนอื่นเป็นผู้ทำ

/** เวลาที่อ่านล่าสุด (null = ยังไม่เคยกดอ่าน ทุกรายการถือว่ายังไม่อ่าน) */
export async function getNotificationsSeenAt(code: string): Promise<string | null> {
  const employeeId = await findEmployeeUuidByCode(code);
  if (!employeeId) return null;
  const { data, error } = await supabaseAdmin.from("employee_notification_seen").select("seen_at").eq("employee_id", employeeId).maybeSingle();
  if (error) {
    console.error("[employee notifications] load seen_at failed", error);
    return null;
  }
  return (data?.seen_at as string | undefined) ?? null;
}

/** จำนวนแจ้งเตือนที่ยังไม่อ่าน (ตัวเลขบนเมนู) โหลดไม่ได้ = 0 */
export async function countUnreadNotifications(code: string): Promise<number> {
  try {
    const employeeId = await findEmployeeUuidByCode(code);
    if (!employeeId) return 0;
    const { data: seen } = await supabaseAdmin.from("employee_notification_seen").select("seen_at").eq("employee_id", employeeId).maybeSingle();
    let query = supabaseAdmin
      .from("welfare_claim_event")
      .select("id, claim:claim_id!inner(employee_id, deleted_at)", { count: "exact", head: true })
      .eq("claim.employee_id", employeeId)
      .is("claim.deleted_at", null)
      .or(`actor_employee_id.is.null,actor_employee_id.neq.${employeeId}`);
    if (seen?.seen_at) query = query.gt("created_at", seen.seen_at);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.error("[employee notifications] count unread failed", err);
    return 0;
  }
}

/** "อ่านทั้งหมดแล้ว" */
export async function markAllNotificationsSeen(code: string) {
  const employeeId = await findEmployeeUuidByCode(code);
  if (!employeeId) throw new Error("employee not found");
  const { error } = await supabaseAdmin.from("employee_notification_seen").upsert({ employee_id: employeeId, seen_at: new Date().toISOString() }, { onConflict: "employee_id" });
  if (error) throw error;
}
