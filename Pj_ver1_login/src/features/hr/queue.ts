import type { ClaimDbStatus } from "@/lib/claims/types";

// คิวคำขอของ HR ตามสเปกรีดีไซน์ (ดีไซน์ H01): แท็บ แถว และข้อความประกอบ คำนวณฝั่ง server แล้วส่งให้ client กรองต่อ

/** แท็บของคิวคำขอตามดีไซน์ H01 */
export type RowTab = "pending" | "revision" | "approved" | "rejected";
export type QueueTab = RowTab | "all";

export const QUEUE_TABS: { id: QueueTab; label: string }[] = [
  { id: "pending", label: "รอตรวจ" },
  { id: "revision", label: "ส่งกลับให้แก้ไข" },
  { id: "approved", label: "อนุมัติแล้ว" },
  { id: "rejected", label: "ไม่อนุมัติ" },
  { id: "all", label: "ทั้งหมด" },
];

/** ?tab= ของ URL (รองรับ "sent" ที่เคยใช้ชั่วคราว) */
export function queueTabOf(param: string | undefined): QueueTab {
  if (param === "sent") return "approved";
  return QUEUE_TABS.find((tab) => tab.id === param)?.id ?? "pending";
}

/** สถานะที่ HR ต้องตัดสิน: ยื่นมาใหม่ หรือการเงินส่งกลับ */
export const HR_PENDING: ClaimDbStatus[] = ["pending_hr", "finance_returned"];
const HR_APPROVED: ClaimDbStatus[] = ["pending_finance", "awaiting_payment", "paid"];
/** สถานะที่นับเป็นการใช้สิทธิ์ (ใช้นับจำนวนครั้ง) */
export const COUNTED: ClaimDbStatus[] = ["pending_hr", "needs_revision", "pending_finance", "finance_returned", "awaiting_payment", "paid"];

export function tabOf(status: ClaimDbStatus): RowTab | null {
  if (HR_PENDING.includes(status)) return "pending";
  if (status === "needs_revision") return "revision";
  if (HR_APPROVED.includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  return null;
}

/** ประเภทคำขอ: short ใช้ในคิว (H01) long ใช้ใต้หัวข้อหน้าตรวจ (H02) */
export function claimKindOf(input: { insurancePaid?: number | null; advance?: boolean }): { short: string; long: string } {
  if (input.advance) return { short: "เบิกล่วงหน้า", long: "เบิกล่วงหน้า" };
  if (input.insurancePaid != null && input.insurancePaid > 0) return { short: "ส่วนเกินประกัน", long: "เบิกส่วนเกินจากประกัน" };
  return { short: "เบิกปกติ", long: "เบิกปกติ" };
}

/** วันปิดรับอนุมัติของรอบจ่าย: รอบ 1 ปิดวันที่ 15 รอบ 2 ปิดสิ้นเดือน (ตรงกับ currentRound) */
export function roundCutoff(year: number, month: number, roundNo: 1 | 2): string {
  const day = roundNo === 1 ? 15 : new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** วันแรกของรอบ (ใช้นับคำขอที่ส่งการเงินในรอบนี้) */
export function roundStart(year: number, month: number, roundNo: 1 | 2): string {
  return `${year}-${String(month).padStart(2, "0")}-${roundNo === 1 ? "01" : "16"}`;
}

/** จำนวนวันระหว่างวันที่สองวัน (YYYY-MM-DD) ตามเวลาไทย */
export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00+07:00`).getTime() - new Date(`${from}T00:00:00+07:00`).getTime()) / 86_400_000);
}

export type QueueRow = {
  claimNo: string;
  status: ClaimDbStatus;
  tab: RowTab;
  employeeCode: string;
  employeeName: string;
  position: string | null;
  department: string;
  /** ชื่อหัวหน้าที่ยื่นแทน (null = ยื่นเอง) */
  proxyBy: string | null;
  benefitName: string;
  /** เลขคำขอ · ประเภท · วันที่ยื่น */
  meta: string;
  /** บรรทัดที่สาม: เหตุที่ยื่นแทน / สิ่งที่ต้องแก้ / วงเงินหลังเบิก */
  hint: { text: string; tone: "muted" | "amber" };
  amount: number;
  /** ป้ายสถานะในคิว (คำขอของ HR เอง = "ส่งหัวหน้า HR ตรวจ") */
  statusLabel: string;
  /** review = HR ตรวจได้ · own = คำขอของผู้ที่ล็อกอินอยู่ ตรวจไม่ได้ · waiting = รอผู้ขอ · view = ดูอย่างเดียว */
  action: "review" | "own" | "waiting" | "view";
  submittedAt: string | null;
};

const PROXY_PREFIX = /^ยื่นแทนเพราะ ([^·]+?)(?: · |$)/;

/** เหตุผลการยื่นแทนถูกเก็บไว้ต้นหมายเหตุ (ยังไม่มีคอลัมน์แยก) */
export function proxyReasonOf(note: string | null): string | null {
  return note?.match(PROXY_PREFIX)?.[1]?.trim() ?? null;
}

export const initialsOf = (name: string) => {
  const parts = name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/, "").trim().split(/\s+/);
  const first = (text = "") => text.match(/[ก-ฮA-Za-z]/)?.[0] ?? "";
  return first(parts[0]) + first(parts[1]);
};

export function daysSince(iso: string, today = new Date()) {
  return Math.max(0, Math.floor((today.getTime() - new Date(iso).getTime()) / 86_400_000));
}
