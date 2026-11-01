import { adminAlerts } from "../../data/mock";
import type { AdminAlert } from "../../types";

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
