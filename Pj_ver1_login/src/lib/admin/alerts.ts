import { cache } from "react";
import { supabaseAdmin } from "../supabase";
import type { AdminAlert, AlertCategory } from "../../types";

/** หน้าแจ้งเตือนแสดงย้อนหลังไม่เกินจำนวนนี้ */
const LIMIT = 200;

interface NotificationRow {
  id: number;
  category: AlertCategory;
  title: string;
  description: string;
  actionable: boolean;
  resolved_at: string | null;
  created_at: string;
  admin_notification_reads: { employee_id: string }[];
}

/** วันที่ตามเวลาไทย (YYYY-MM-DD) */
function bangkokDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

/** จำนวนวันตามปฏิทินไทย (0 = วันนี้) และข้อความเวลาแบบสัมพัทธ์ */
function relativeTime(iso: string, now = new Date()): { time: string; daysAgo: number } {
  const at = new Date(iso);
  const daysAgo = Math.max(0, Math.round((Date.parse(bangkokDate(now)) - Date.parse(bangkokDate(at))) / 86_400_000));
  if (daysAgo === 1) return { time: "เมื่อวาน", daysAgo };
  if (daysAgo > 1) return { time: `${daysAgo} วันที่แล้ว`, daysAgo };

  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return { time: "เมื่อสักครู่", daysAgo };
  if (minutes < 60) return { time: `${minutes} นาทีที่แล้ว`, daysAgo };
  return { time: `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`, daysAgo };
}

interface ProposalAlertRow {
  id: string;
  proposal_no: string;
  name_th: string | null;
  status: "needs_info" | "approved" | "rejected";
  decision_note: string | null;
  decided_at: string | null;
  updated_at: string;
  benefit: { name_th: string } | null;
}

const PROPOSAL_ALERT_TITLE: Record<ProposalAlertRow["status"], string> = {
  needs_info: "หัวหน้า HR ขอข้อมูลข้อเสนอสวัสดิการเพิ่มเติม",
  approved: "หัวหน้า HR อนุมัติข้อเสนอสวัสดิการแล้ว",
  rejected: "หัวหน้า HR ไม่อนุมัติข้อเสนอสวัสดิการ",
};

/**
 * แหล่งข้อมูลแจ้งเตือนของ Admin เพียงที่เดียว – sidebar, การ์ดสรุป, แผงแจ้งเตือนบนหน้าแรก และหน้าแจ้งเตือน
 * อ่านจากที่นี่ทั้งหมด ตัวเลขจึงตรงกันทุกหน้า (cache: layout กับหน้าเดียวกันอ่านฐานข้อมูลครั้งเดียว)
 * "ยังไม่อ่าน" คิดแยกต่อ admin ที่กำลังดู (viewerId = employee_id)
 */
export const getAdminAlerts = cache(async (viewerId: string): Promise<AdminAlert[]> => {
  try {
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data, error }, proposalsRes] = await Promise.all([
      supabaseAdmin
        .from("admin_notifications")
        .select("id, category, title, description, actionable, resolved_at, created_at, admin_notification_reads(employee_id)")
        .eq("admin_notification_reads.employee_id", viewerId)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabaseAdmin
        .from("welfare_benefit_proposal")
        .select("id, proposal_no, name_th, status, decision_note, decided_at, updated_at, benefit:benefit_id(name_th)")
        .eq("proposer_role", "SUPER_ADMIN")
        .in("status", ["needs_info", "approved", "rejected"])
        .is("deleted_at", null)
        .gte("updated_at", since30d)
        .order("updated_at", { ascending: false })
        .returns<ProposalAlertRow[]>(),
    ]);
    if (error) throw error;

    const baseAlerts: (AdminAlert & { sortIso: string })[] = (data as NotificationRow[]).map((row) => ({
      id: String(row.id),
      category: row.category,
      title: row.title,
      description: row.description,
      ...relativeTime(row.created_at),
      unread: row.admin_notification_reads.length === 0,
      actionable: row.actionable && !row.resolved_at,
      sortIso: row.created_at,
    }));

    const proposalAlerts: (AdminAlert & { sortIso: string })[] = (proposalsRes.data ?? []).map((row) => {
      const iso = row.decided_at ?? row.updated_at;
      const benefitName = row.name_th ?? row.benefit?.name_th ?? row.proposal_no;
      return {
        id: `prop-${row.id}`,
        category: "welfare",
        title: `${PROPOSAL_ALERT_TITLE[row.status]}: ${benefitName}`,
        description: `ข้อเสนอ ${row.proposal_no}${row.decision_note ? ` · ${row.decision_note}` : ""}`,
        ...relativeTime(iso),
        unread: row.status === "needs_info",
        actionable: row.status === "needs_info",
        sortIso: iso,
      };
    });

    return [...baseAlerts, ...proposalAlerts]
      .sort((a, b) => b.sortIso.localeCompare(a.sortIso))
      .map(({ sortIso: _sortIso, ...alert }) => alert);
  } catch (err) {
    // อ่านแจ้งเตือนไม่ได้ต้องไม่ทำให้หน้า Admin ทั้งหมดล้ม
    // PostgrestError ไม่ใช่ Error จึงพิมพ์ code/message เอง (ไม่งั้นขึ้นแค่ {})
    const { code, message } = (err ?? {}) as { code?: string; message?: string };
    if (code === "PGRST205") {
      console.warn("[ALERT] ยังไม่มีตาราง admin_notifications – รัน migration 20261103090000_admin_notifications.sql ก่อน");
    } else {
      console.error("Supabase getAdminAlerts error", code, message ?? err);
    }
    return [];
  }
});

/** จำนวนแจ้งเตือนที่ยังไม่อ่าน – ตัวเลขเดียวกับ "ยังไม่อ่าน" ในหน้าแจ้งเตือน */
export function countUnread(alerts: AdminAlert[]): number {
  return alerts.filter((alert) => alert.unread).length;
}

export interface NewAdminAlert {
  category: AlertCategory;
  title: string;
  description: string;
  actionable?: boolean;
}

/** สร้างแจ้งเตือนจากเหตุการณ์ในระบบ – พลาดได้โดยไม่ทำให้งานหลัก (ล็อกอิน, บันทึกผู้ใช้) ล้ม */
export async function createAdminAlert(alert: NewAdminAlert): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("admin_notifications").insert({
      category: alert.category,
      title: alert.title,
      description: alert.description,
      actionable: alert.actionable ?? false,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[ALERT] create failed", err);
  }
}

export async function markAlertsRead(viewerId: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin
    .from("admin_notification_reads")
    .upsert(ids.map((id) => ({ notification_id: id, employee_id: viewerId })), { ignoreDuplicates: true });
  if (error) throw error;
}

export async function markAlertUnread(viewerId: string, id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("admin_notification_reads")
    .delete()
    .eq("notification_id", id)
    .eq("employee_id", viewerId);
  if (error) throw error;
}

/** อ่านแล้วทั้งหมด: เฉพาะรายการที่หน้าแจ้งเตือนแสดงอยู่ (LIMIT ล่าสุด) */
export async function markAllAlertsRead(viewerId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  await markAlertsRead(viewerId, data.map((row) => row.id as number));
}

/**
 * กดตรวจสอบ: ปิดงาน "ต้องดำเนินการ" ให้ทุก admin และนับว่าคนกดอ่านแล้ว
 * คืนค่า false ถ้าไม่พบรายการ หรือมี admin คนอื่นปิดไปก่อนแล้ว
 */
export async function resolveAlert(viewerId: string, id: number): Promise<{ found: boolean; resolved: boolean; title?: string }> {
  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .update({ resolved_at: new Date().toISOString(), resolved_by: viewerId })
    .eq("id", id)
    .eq("actionable", true)
    .is("resolved_at", null)
    .select("title");
  if (error) throw error;

  if (data.length > 0) {
    await markAlertsRead(viewerId, [id]);
    return { found: true, resolved: true, title: data[0].title };
  }

  const { count } = await supabaseAdmin
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  const found = (count ?? 0) > 0;
  if (found) await markAlertsRead(viewerId, [id]);
  return { found, resolved: false };
}
