import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { CLAIM_STATUS_LABEL, type ClaimDbStatus } from "@/lib/claims/types";

// ประวัติการแก้ไขของ HR (ดีไซน์ H08) อ่านอย่างเดียว:
// รวม audit_logs ที่เกี่ยวกับงาน HR กับการตัดสินคำขอของ HR ใน welfare_claim_event

export type HrLogCategory = "claim" | "employee" | "limit" | "benefit";

export type HrLogEntry = {
  id: string;
  /** ISO */
  at: string;
  category: HrLogCategory;
  action: string;
  item: string;
  /** ก่อน → หลัง */
  detail: string;
};

const AUDIT_ACTIONS = ["EMPLOYEE_CREATE", "EMPLOYEE_LIMIT_UPDATE", "WELFARE_CREATE", "WELFARE_UPDATE"] as const;
const LIMIT = 500;

const CHANGE_LABEL: Record<string, string> = {
  name: "ชื่อ",
  amount: "วงเงิน",
  approver: "ผู้อนุมัติ",
  eligible: "ผู้มีสิทธิ์",
  documents: "เอกสาร",
  maxClaims: "จำนวนครั้ง",
  startDate: "วันเริ่มใช้",
  budgetType: "รอบวงเงิน",
  status: "สถานะ",
  description: "รายละเอียด",
};

const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const shown = (value: unknown) => (value === null || value === undefined || value === "" ? "ไม่มี" : String(value));
const thaiShort = (iso: string) => new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

type AuditRow = {
  id: number;
  action: (typeof AUDIT_ACTIONS)[number];
  details: string | null;
  target_id: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  reason: string | null;
  created_at: string;
};

type EventRow = {
  id: number;
  kind: string;
  from_status: ClaimDbStatus | null;
  to_status: ClaimDbStatus | null;
  note: string | null;
  amount_before: number | string | null;
  amount_after: number | string | null;
  created_at: string;
  claim: { claim_no: string } | null;
};

const withReason = (text: string, reason: string | null) => [text, reason ? `เหตุผล: ${reason}` : ""].filter(Boolean).join(" · ");

function fromAudit(row: AuditRow, employeeName: Map<string, string>, benefitName: Map<string, string>): HrLogEntry {
  const base = { id: `a${row.id}`, at: row.created_at };
  const target = row.target_id ?? "";
  if (row.action === "EMPLOYEE_CREATE") {
    return { ...base, category: "employee", action: "เพิ่มพนักงาน", item: [target, employeeName.get(target)].filter(Boolean).join(" "), detail: row.details ?? "—" };
  }
  if (row.action === "EMPLOYEE_LIMIT_UPDATE") {
    const effective = row.details?.match(/มีผล (\d{4}-\d{2}-\d{2})/)?.[1];
    const changes = Object.entries(row.changes ?? {}).map(
      ([code, change]) => `${benefitName.get(code) ?? code} ${change.old === null ? "วงเงินกลาง" : money(Number(change.old))} → ${money(Number(change.new))}`,
    );
    const detail = [...changes, effective ? `มีผล ${thaiShort(effective)}` : ""].filter(Boolean).join(" · ");
    return { ...base, category: "limit", action: "ปรับวงเงินรายคน", item: [target, employeeName.get(target)].filter(Boolean).join(" "), detail: withReason(detail || (row.details ?? "—"), row.reason) };
  }
  const changes = Object.entries(row.changes ?? {}).map(([key, change]) =>
    row.action === "WELFARE_CREATE" ? `${CHANGE_LABEL[key] ?? key}: ${shown(change.new)}` : `${CHANGE_LABEL[key] ?? key}: ${shown(change.old)} → ${shown(change.new)}`,
  );
  return {
    ...base,
    category: "benefit",
    action: row.action === "WELFARE_CREATE" ? "เพิ่มสวัสดิการ" : "แก้ไขสวัสดิการ",
    item: [target, benefitName.get(target) ?? (changes.length > 0 ? row.details : null)].filter(Boolean).join(" "),
    detail: withReason(changes.length > 0 ? changes.join(" · ") : (row.details ?? "—"), row.reason),
  };
}

const EVENT_ACTION: Record<string, string> = {
  hr_approved: "อนุมัติคำขอ",
  revision_requested: "ส่งกลับให้แก้ไข",
  rejected: "ไม่อนุมัติคำขอ",
  amount_adjusted: "ปรับยอดอนุมัติ",
  returned: "ส่งกลับให้แก้ไข",
};

function fromEvent(row: EventRow): HrLogEntry {
  const before = row.amount_before === null ? null : Number(row.amount_before);
  const after = row.amount_after === null ? null : Number(row.amount_after);
  const adjusted = before !== null && after !== null && before !== after;
  const change = adjusted
    ? `ยอด ${money(before)} → ${money(after)}`
    : row.from_status && row.to_status
      ? `สถานะ: ${CLAIM_STATUS_LABEL[row.from_status] ?? row.from_status} → ${CLAIM_STATUS_LABEL[row.to_status] ?? row.to_status}`
      : "";
  const action = EVENT_ACTION[row.kind] ?? row.kind;
  return {
    id: `e${row.id}`,
    at: row.created_at,
    category: "claim",
    action: row.kind === "hr_approved" && adjusted ? `${action} (ปรับยอด)` : action,
    item: row.claim?.claim_no ?? "—",
    detail: withReason(change, row.note) || "—",
  };
}

/** รายการล่าสุดเรียงใหม่ไปเก่า (null = โหลดไม่สำเร็จ) */
export async function getHrLog(): Promise<HrLogEntry[] | null> {
  try {
    const [audit, events, employees, benefits] = await Promise.all([
      supabaseAdmin
        .from("audit_logs")
        .select("id, action, details, target_id, changes, reason, created_at")
        .in("action", [...AUDIT_ACTIONS])
        .order("created_at", { ascending: false })
        .limit(LIMIT)
        .returns<AuditRow[]>(),
      supabaseAdmin
        .from("welfare_claim_event")
        .select("id, kind, from_status, to_status, note, amount_before, amount_after, created_at, claim:claim_id(claim_no)")
        .eq("actor_role", "HR")
        .in("kind", Object.keys(EVENT_ACTION))
        .order("created_at", { ascending: false })
        .limit(LIMIT)
        .returns<EventRow[]>(),
      supabaseAdmin.from("employee").select("employee_code, first_name_th, last_name_th"),
      supabaseAdmin.from("welfare_benefit").select("code, name_th"),
    ]);
    if (audit.error) throw audit.error;
    if (events.error) throw events.error;
    const employeeName = new Map((employees.data ?? []).map((row) => [row.employee_code as string, `${row.first_name_th} ${row.last_name_th === "-" ? "" : row.last_name_th}`.trim()]));
    const benefitName = new Map((benefits.data ?? []).map((row) => [row.code as string, row.name_th as string]));
    return [...(audit.data ?? []).map((row) => fromAudit(row, employeeName, benefitName)), ...(events.data ?? []).map(fromEvent)].sort((a, b) => b.at.localeCompare(a.at));
  } catch (err) {
    console.error("[hr log] load failed", err);
    return null;
  }
}
