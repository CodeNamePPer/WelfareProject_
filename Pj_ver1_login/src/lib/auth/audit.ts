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
  | "USER_UPDATE"
  | "EMPLOYEE_CREATE" // HR เพิ่มพนักงานใหม่ (targetId = รหัสพนักงาน)
  | "EMPLOYEE_LIMIT_UPDATE" // HR ปรับวงเงินรายคน (targetId = รหัสพนักงาน, changes = { รหัสสวัสดิการ: { old, new } })
  | "ACCOUNT_CREATE" // admin ออกบัญชีให้พนักงาน (targetId = รหัสพนักงาน)
  | "NOTIFICATION_RESOLVE"
  | "WELFARE_CREATE"
  | "WELFARE_UPDATE"
  | "PASSWORD_RESET" // admin รีเซ็ตให้ (targetId = เจ้าของบัญชี)
  | "PASSWORD_CHANGE" // เจ้าของบัญชีตั้งรหัสใหม่เอง
  | "PASSWORD_CHANGE_FAILED"; // ใส่รหัสปัจจุบันผิดตอนเปลี่ยนรหัส

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

interface ProposalEventRow {
  id: number;
  kind: string;
  actor_role: string;
  note: string | null;
  created_at: string;
  proposal: {
    id: string;
    proposal_no: string;
    kind: "create" | "update" | "close";
    name_th: string | null;
    benefit: { code: string; name_th: string } | null;
  } | null;
  actor: { employee_code: string; first_name_th: string; last_name_th: string } | null;
}

const PROPOSAL_EVENT_TITLE: Record<string, string> = {
  submitted: "ส่งข้อเสนอสวัสดิการให้หัวหน้า HR",
  revised: "แก้ไขและส่งข้อเสนอสวัสดิการกลับ",
  info_requested: "หัวหน้า HR ขอข้อมูลข้อเสนอสวัสดิการเพิ่มเติม",
  approved: "หัวหน้า HR อนุมัติข้อเสนอสวัสดิการ",
  rejected: "หัวหน้า HR ไม่อนุมัติข้อเสนอสวัสดิการ",
  withdrawn: "ถอนข้อเสนอสวัสดิการ",
};

const PROPOSAL_KIND_LABEL: Record<string, string> = {
  create: "สร้างสวัสดิการใหม่",
  update: "แก้ไขสวัสดิการ",
  close: "ปิดใช้สวัสดิการ",
};

const PROPOSAL_ACTOR_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "ผู้ดูแลระบบ",
  HR: "HR",
  HR_HEAD: "หัวหน้า HR",
};

export async function listProposalAuditEntries(limit = 200): Promise<import("../../types").AuditEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("welfare_benefit_proposal_event")
      .select(
        "id, kind, actor_role, note, created_at, proposal:proposal_id(id, proposal_no, kind, name_th, benefit:benefit_id(code, name_th)), actor:actor_employee_id(employee_code, first_name_th, last_name_th)",
      )
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<ProposalEventRow[]>();
    if (error || !data) return [];

    return data.flatMap((row): import("../../types").AuditEntry[] => {
      if (!row.proposal) return [];
      const at = new Date(row.created_at)
        .toLocaleString("sv-SE", { timeZone: "Asia/Bangkok", hour12: false })
        .slice(0, 16)
        .replace(" ", "T");
      const actorName = row.actor
        ? `${row.actor.first_name_th} ${row.actor.last_name_th === "-" ? "" : row.actor.last_name_th}`.trim()
        : "ระบบ";
      const actor = row.actor ? `${actorName} (${row.actor.employee_code})` : "ระบบ";
      const benefitTitle = row.proposal.name_th ?? row.proposal.benefit?.name_th ?? row.proposal.proposal_no;
      const kindLabel = PROPOSAL_KIND_LABEL[row.proposal.kind] ?? row.proposal.kind;
      return [
        {
          id: `prop-evt-${row.id}`,
          at,
          actor,
          actorRole: PROPOSAL_ACTOR_ROLE_LABEL[row.actor_role] ?? row.actor_role,
          title: `${PROPOSAL_EVENT_TITLE[row.kind] ?? row.kind}: ${benefitTitle}`,
          detail: `${kindLabel} (${row.proposal.proposal_no})`,
          category: "settings",
          action: "welfare",
          target: {
            code: row.proposal.proposal_no,
            name: benefitTitle,
            href: `/admin/benefits?tab=proposals&proposal=${row.proposal.id}`,
          },
          change: row.note ? { fields: [], reason: row.note } : undefined,
        },
      ];
    });
  } catch (err) {
    console.error("[audit] listProposalAuditEntries error", err);
    return [];
  }
}
