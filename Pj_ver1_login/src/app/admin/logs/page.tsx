import { LogClient, type LogRow } from "@/features/hr/LogClient";
import { HrPage } from "@/features/hr/ui";
import { LOG_SECTIONS, SECTIONS, SECTION_OF } from "@/features/logs/sections";
import { toLogEntries } from "@/features/logs/fromAuditLog";
import { listAudit, listProposalAuditEntries } from "@/lib/auth/audit";
import { getAllUsers } from "@/lib/auth/users";
import type { AuditEntry } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประวัติของระบบ" };

// อ่าน log ล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

const TABS = [{ id: "all", label: "ทั้งหมด" }, ...LOG_SECTIONS.map((id) => ({ id, label: SECTIONS[id].label }))];

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

// ประวัติของระบบ (ดีไซน์ C แบบหน้าประวัติของ HR) · ?tab=people / welfare / system เปิดแท็บนั้นทันที
export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [rows, proposalEntries, users] = await Promise.all([listAudit(), listProposalAuditEntries(), getAllUsers()]);
  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  const entries = [...toLogEntries(rows, userMap), ...proposalEntries].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <HrPage>
      <LogClient
        entries={entries.map(toRow)}
        tabs={TABS}
        initialTab={LOG_SECTIONS.find((id) => id === tab) ?? "all"}
        title="ประวัติของระบบ"
        description="การกระทำทั้งหมดในระบบ ค่าก่อนและหลังแก้ไข · แก้ไขหรือลบไม่ได้"
        csvName="system-log.csv"
      />
    </HrPage>
  );
}
