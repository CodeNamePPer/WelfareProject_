import "server-only";
import type { LogRow } from "@/features/hr/LogClient";
import { SECTION_OF } from "@/features/logs/sections";
import { toLogEntries } from "@/features/logs/fromAuditLog";
import { listAudit, listProposalAuditEntries } from "@/lib/auth/audit";
import { getAllUsers } from "@/lib/auth/users";
import type { AuditEntry } from "@/types";

/** แถวของ Admin ในรูปแบบตาราง H08: การกระทำ · รายการ · ก่อน → หลัง พร้อมผู้ดำเนินการ */
function toRow(entry: AuditEntry): LogRow {
  const target = entry.target ? [entry.target.code, entry.target.name].filter(Boolean).join(" ") : entry.importSummary ? entry.importSummary.file : "";
  const changes = entry.change?.fields.map((field) => `${field.label}: ${field.before || "ไม่มี"} → ${field.after || "ไม่มี"}`) ?? [];
  const detail = [changes.length > 0 ? changes.join(" · ") : entry.detail, entry.change?.reason ? `เหตุผล: ${entry.change.reason}` : "", entry.ip ? `IP ${entry.ip}` : ""]
    .filter(Boolean)
    .join(" · ");
  const result = entry.result === "failed" ? " (ไม่สำเร็จ)" : entry.result === "partial" ? " (สำเร็จบางส่วน)" : "";
  return {
    id: entry.id,
    at: entry.at,
    category: SECTION_OF[entry.action],
    action: `${entry.title}${result}`,
    by: entry.actorRole && entry.actorRole !== "ระบบ" ? `${entry.actor} · ${entry.actorRole}` : entry.actor,
    item: target || "—",
    detail: detail || "—",
  };
}

/** ประวัติของระบบ (หน้า /admin/logs) · all = ทุกรายการ ใช้ตอนส่งออก ไม่งั้นเฉพาะรายการล่าสุดที่แสดงบนหน้า */
export async function getAdminLogRows(options: { all?: boolean } = {}): Promise<LogRow[]> {
  const [rows, proposalEntries, users] = await Promise.all([
    listAudit(options.all ? "all" : undefined),
    listProposalAuditEntries(options.all ? "all" : undefined),
    getAllUsers(),
  ]);
  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  const entries = [...toLogEntries(rows, userMap), ...proposalEntries].sort((a, b) => b.at.localeCompare(a.at));
  return entries.map(toRow);
}
