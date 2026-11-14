import type { ClaimDbStatus, ClaimRecord } from "@/lib/claims/types";

// คิวคำขอของ HR ตามดีไซน์ H01: แท็บ แถว และข้อความประกอบ คำนวณฝั่ง server แล้วส่งให้ client กรองต่อ

export type QueueTab = "pending" | "revision" | "approved" | "rejected" | "all";

export const QUEUE_TABS: { id: QueueTab; label: string }[] = [
  { id: "pending", label: "รอตรวจ" },
  { id: "revision", label: "ส่งกลับให้แก้ไข" },
  { id: "approved", label: "อนุมัติแล้ว" },
  { id: "rejected", label: "ไม่อนุมัติ" },
  { id: "all", label: "ทั้งหมด" },
];

/** สถานะที่ HR ต้องตัดสิน: ยื่นมาใหม่ หรือการเงินส่งกลับ */
export const HR_PENDING: ClaimDbStatus[] = ["pending_hr", "finance_returned"];
const HR_APPROVED: ClaimDbStatus[] = ["pending_finance", "awaiting_payment", "paid"];

export function tabOf(status: ClaimDbStatus): Exclude<QueueTab, "all"> | null {
  if (HR_PENDING.includes(status)) return "pending";
  if (status === "needs_revision") return "revision";
  if (HR_APPROVED.includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  return null;
}

export type QueueRow = {
  claimNo: string;
  status: ClaimDbStatus;
  tab: Exclude<QueueTab, "all">;
  employeeCode: string;
  employeeName: string;
  initials: string;
  /** ตำแหน่ง · แผนก */
  role: string;
  department: string;
  /** ชื่อหัวหน้าที่ยื่นแทน (null = ยื่นเอง) */
  proxyBy: string | null;
  benefitName: string;
  /** เลขคำขอ · ยื่นเอง/ยื่นแทน · วันที่ยื่น */
  meta: string;
  /** บรรทัดที่สาม: เหตุที่ยื่นแทน / สิ่งที่ต้องแก้ / วงเงินหลังเบิก */
  hint: { text: string; tone: "muted" | "amber" };
  amount: number;
  /** ทำอะไรกับแถวนี้ได้ */
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
