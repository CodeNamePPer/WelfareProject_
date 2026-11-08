// กฎการตรวจคำขอ ใช้ร่วมกันระหว่างคิว (/hr/home) และหน้ารายละเอียดคำขอ
import type { HrEmployee } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import type { PendingRequest } from "../sample/queue";

export type RequestAction = "approve" | "reject" | "return";

/**
 * เหตุที่ยังอนุมัติไม่ได้ เรียงตามความสำคัญ (ข้อแรกกำหนดการกระทำที่แนะนำ)
 * action = null หมายถึงผู้ที่เข้าระบบไม่ควรตัดสินคำขอนี้เอง
 */
export type Blocker = { message: string; action: Exclude<RequestAction, "approve"> | null; reason: string };

export const ACTION_COPY: Record<RequestAction, { title: string; confirm: string; done: string }> = {
  approve: { title: "ยืนยันการอนุมัติ", confirm: "ยืนยันอนุมัติ", done: "อนุมัติ" },
  reject: { title: "ปฏิเสธคำขอ", confirm: "ยืนยันปฏิเสธ", done: "ปฏิเสธ" },
  return: { title: "ส่งกลับให้พนักงานแก้ไข", confirm: "ส่งกลับให้แก้ไข", done: "ส่งกลับ" },
};

/** คำขอที่รอตั้งแต่จำนวนวันนี้ขึ้นไปถือว่าเกินกำหนด */
export const OVERDUE_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export const baht = new Intl.NumberFormat("th-TH");

export function todayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS));
}

export function waitingLabel(days: number) {
  return days === 0 ? "ยื่นวันนี้" : `รอ ${days} วัน`;
}

/** วงเงินคงเหลือหลังอนุมัติ (null = ไม่ใช่คำขอเบิก) */
export function remainingAfter(request: PendingRequest): number | null {
  return request.itemType === "benefit" ? request.limit - request.used - request.amount : null;
}

/**
 * ทุกเหตุที่อนุมัติไม่ได้ (ไม่ใช่แค่ข้อแรก) เพื่อให้ HR เห็นครบในครั้งเดียว
 * นโยบาย: ผู้ที่ลาออก/เสียชีวิต หรือไม่ใช่พนักงานของบริษัท เบิกไม่ได้ทุกกรณี
 */
export function findBlockers(request: PendingRequest, employee: HrEmployee | null, viewerCode: string | null): Blocker[] {
  const blockers: Blocker[] = [];
  const remaining = remainingAfter(request);
  if (!employee) {
    blockers.push({
      message: "ไม่พบรหัสพนักงานนี้ในระบบ จึงไม่มีสิทธิ์เบิก",
      action: "reject",
      reason: "ไม่พบผู้ยื่นในรายชื่อพนักงานของบริษัท จึงไม่มีสิทธิ์รับสวัสดิการ",
    });
  } else if (employee.status !== "ACTIVE") {
    const since = employee.statusDate ? ` ตั้งแต่ ${formatThaiDate(employee.statusDate)}` : "";
    blockers.push({
      message: `พนักงาน${employee.statusLabel}${since} จึงไม่มีสิทธิ์เบิก`,
      action: "reject",
      reason: `ผู้ยื่นมีสถานะ${employee.statusLabel}${since} ไม่ได้เป็นพนักงานของบริษัทแล้ว จึงไม่มีสิทธิ์รับสวัสดิการ`,
    });
  }
  if (viewerCode && request.employeeCode === viewerCode) {
    blockers.push({ message: "เป็นคำขอของคุณเอง ต้องให้เจ้าหน้าที่คนอื่นเป็นผู้ตัดสิน", action: null, reason: "" });
  }
  if (remaining !== null && remaining < 0) {
    blockers.push({
      message: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remaining)} บาท`,
      action: "return",
      reason: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remaining)} บาท กรุณาปรับยอดเบิกไม่เกิน ${baht.format(request.limit - request.used)} บาท`,
    });
  }
  if (request.itemType === "benefit" && (request.attachments?.length ?? 0) === 0) {
    blockers.push({ message: "ไม่มีใบเสร็จหรือเอกสารประกอบ", action: "return", reason: "กรุณาแนบใบเสร็จหรือเอกสารประกอบการเบิก" });
  }
  return blockers;
}

/** การกระทำที่แนะนำ: ข้อแรกที่ระบุการกระทำไว้ (null = ไม่ควรตัดสินเอง หรือไม่มีเหตุติดขัด) */
export function suggestedAction(blockers: Blocker[]): Blocker["action"] {
  if (blockers.some((blocker) => blocker.action === null)) return null;
  return blockers[0]?.action ?? null;
}

/** ผู้ที่เข้าระบบตัดสินคำขอนี้ได้หรือไม่ */
export function canDecide(blockers: Blocker[]) {
  return !blockers.some((blocker) => blocker.action === null);
}

/** เหตุผลตั้งต้นของการกระทำนั้น รวมทุกข้อที่ตรงกัน */
export function prefillReason(blockers: Blocker[], action: RequestAction) {
  return blockers.filter((blocker) => blocker.action === action).map((blocker) => blocker.reason).join(" และ ");
}

/** ลิงก์หน้ารายละเอียดคำขอ */
export function requestHref(id: string) {
  return `/hr/home/requests/${encodeURIComponent(id)}`;
}
