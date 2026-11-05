import { LogsPage } from "@/features/logs/LogsPage";
import { LOG_SECTIONS } from "@/features/logs/sections";
import { toLogEntries } from "@/features/logs/fromAuditLog";
import { listAudit } from "@/lib/auth/audit";
import { getAllUsers } from "@/lib/auth/users";

// อ่าน log ล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// ?tab=people / welfare / system เปิดแท็บนั้นทันที (เช่น ลิงก์จากหน้าจัดการสวัสดิการ)
export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [rows, users] = await Promise.all([listAudit(), getAllUsers()]);
  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  return <LogsPage entries={toLogEntries(rows, userMap)} initialSection={LOG_SECTIONS.find((id) => id === tab)} />;
}
