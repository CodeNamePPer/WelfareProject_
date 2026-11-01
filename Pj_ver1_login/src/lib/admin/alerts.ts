import { adminAlerts } from "../../data/mock";
import type { AdminAlert, AlertCategory, NotificationItem, NotificationKind } from "../../types";

/**
 * แหล่งข้อมูลแจ้งเตือนของ Admin เพียงที่เดียว – sidebar, การ์ดสรุป, แผงแจ้งเตือนบนหน้าแรก และหน้าแจ้งเตือน
 * อ่านจากที่นี่ทั้งหมด ตัวเลขจึงตรงกันทุกหน้า
 * TODO: รอตารางแจ้งเตือน (notification) แล้วเปลี่ยนเป็นอ่านจากฐานข้อมูล
 */
export function getAdminAlerts(): AdminAlert[] {
  return adminAlerts;
}

/** จำนวนแจ้งเตือนที่ยังไม่อ่าน – ตัวเลขเดียวกับ "ยังไม่อ่าน" ในหน้าแจ้งเตือน */
export function countUnread(alerts: AdminAlert[]): number {
  return alerts.filter((alert) => alert.unread).length;
}

const kindOf: Record<AlertCategory, NotificationKind> = {
  access: "access-request",
  expiring: "expiring",
  security: "system",
  system: "system",
  welfare: "system",
};

/** แปลงเป็นรายการสำหรับแผงแจ้งเตือนบนหน้าแรก (งานที่ต้องดำเนินการก่อน ตามด้วยรายการล่าสุด) */
export function toDashboardNotifications(alerts: AdminAlert[]): NotificationItem[] {
  const ordered = [...alerts.filter((a) => a.actionable), ...alerts.filter((a) => !a.actionable)];
  return ordered.map((alert) => ({
    id: alert.id,
    kind: kindOf[alert.category],
    title: alert.title,
    description: alert.description,
    time: alert.time,
    unread: alert.unread,
    actionLabel: alert.actionable ? "ตรวจสอบ" : undefined,
  }));
}
