import { LogsPage } from "@/features/logs/LogsPage";
import { LOG_SECTIONS } from "@/features/logs/sections";
import { toLogEntries } from "@/features/logs/fromAuditLog";
import { listAudit, listProposalAuditEntries } from "@/lib/auth/audit";
import { getAllUsers } from "@/lib/auth/users";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประวัติของระบบ" };

// อ่าน log ล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// ?tab=people / welfare / system เปิดแท็บนั้นทันที (เช่น ลิงก์จากหน้าจัดการสวัสดิการ)
export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [rows, proposalEntries, users] = await Promise.all([listAudit(), listProposalAuditEntries(), getAllUsers()]);
  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  const entries = [...toLogEntries(rows, userMap), ...proposalEntries].sort((a, b) => b.at.localeCompare(a.at));
  return <LogsPage entries={entries} initialSection={LOG_SECTIONS.find((id) => id === tab)} />;
}
