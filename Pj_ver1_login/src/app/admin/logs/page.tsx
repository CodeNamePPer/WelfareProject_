import { LogsPage } from "@/features/logs/LogsPage";
import { toLogEntries } from "@/features/logs/fromAuditLog";
import { listAudit } from "@/lib/auth/audit";
import { getAllUsers } from "@/lib/auth/users";

// อ่าน log ล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const [rows, users] = await Promise.all([listAudit(), getAllUsers()]);
  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  return <LogsPage entries={toLogEntries(rows, userMap)} />;
}
