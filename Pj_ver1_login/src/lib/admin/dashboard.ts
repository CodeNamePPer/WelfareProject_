import "server-only";
import { supabaseAdmin } from "../supabase";
import { listAudit } from "../auth/audit";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { getAllUsers } from "../auth/users";
import { formatShortThaiDate } from "../format";
import { toLogEntries } from "../../features/logs/fromAuditLog";
import { summaryStats as mockStats } from "../../data/mock";
import type { Employee, LogEntry, LogGroup, RoleCount, SummaryStats } from "../../types";

/**
 * ข้อมูลหน้า Admin Dashboard จาก Supabase (เรียกฝั่ง server เท่านั้น)
 * ส่วนสวัสดิการ/คำขอเบิก/แจ้งเตือนยังใช้ mock เพราะยังไม่มีตาราง
 */
export interface AdminDashboardData {
  stats: SummaryStats;
  roleCounts: RoleCount[];
  employees: Employee[];
  logGroups: LogGroup[];
}

const TZ = "Asia/Bangkok";
const ROLE_ORDER: Role[] = ["SUPER_ADMIN", "HR", "FINANCE", "EMPLOYEE"];
const LOG_LIMIT = 10;
// listAudit คืนทุก action แต่ตัวแปลงตัดล็อกอิน/ออกสำเร็จทิ้ง จึงดึงเผื่อไว้แล้วค่อยตัดเหลือ 10
const AUDIT_FETCH = 200;
const ERROR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** วันที่ปัจจุบันตามเวลาไทย "YYYY-MM-DD" */
function bangkokDate(at: Date = new Date()): string {
  return at.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** ช่วง [วันแรกของเดือนนี้, วันแรกของเดือนหน้า) ตามเวลาไทย */
function currentMonthRange(): { from: string; to: string } {
  const [year, month] = bangkokDate().split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  return { from: `${year}-${pad(month)}-01`, to: `${next}-01` };
}

async function safe<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`[admin dashboard] ${label} failed`, err);
    return fallback;
  }
}

/** รหัสพนักงานที่เริ่มงานในเดือนนี้ */
function fetchHiredThisMonth(): Promise<Set<string>> {
  return safe("hired this month", new Set<string>(), async () => {
    const { from, to } = currentMonthRange();
    const { data, error } = await supabaseAdmin
      .from("employee")
      .select("employee_code")
      .is("deleted_at", null)
      .gte("hire_date", from)
      .lt("hire_date", to);
    if (error) throw error;
    return new Set(data.map((row) => row.employee_code as string));
  });
}

function fetchSystemErrors(): Promise<number> {
  return safe("system errors", 0, async () => {
    const since = new Date(Date.now() - ERROR_WINDOW_MS).toISOString();
    const { count, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .or("action.like.LOGIN_BLOCKED%,action.like.LOGIN_FAILED%")
      .gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
  });
}

function fetchEmployees(): Promise<Employee[]> {
  return safe("employees", [] as Employee[], async () => {
    const { data, error } = await supabaseAdmin
      .from("employee")
      .select("employee_code, first_name_th, last_name_th")
      .eq("employment_status", "active")
      .is("deleted_at", null)
      .order("employee_code", { ascending: true });
    if (error) throw error;
    return data.map((row) => {
      const last = row.last_name_th?.trim();
      const name = [row.first_name_th?.trim(), last && last !== "-" ? last : null].filter(Boolean).join(" ");
      return { id: row.employee_code, code: row.employee_code, name };
    });
  });
}

/** "2026-10-31T09:42" (เวลาไทย) → กลุ่มตามวัน: วันนี้ / เมื่อวาน / 29 ต.ค. 69 */
function groupByDay(entries: ReturnType<typeof toLogEntries>): LogGroup[] {
  const today = bangkokDate();
  const yesterday = bangkokDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const groups = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    const [day, time] = entry.at.split("T");
    const label = day === today ? "วันนี้" : day === yesterday ? "เมื่อวาน" : formatShortThaiDate(day);
    const list = groups.get(label) ?? [];
    list.push({
      id: entry.id,
      kind: entry.category === "settings" ? "permission" : "system",
      title: entry.title,
      detail: entry.detail,
      time: `${time} น.`,
      change: entry.change ? { before: entry.change.before, after: entry.change.after } : undefined,
    });
    groups.set(label, list);
  }

  return [...groups].map(([label, list]) => ({ label, entries: list }));
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  // getAllUsers / listAudit จัดการ error เองแล้ว (log และคืน [])
  const [users, auditRows, hiredThisMonth, systemErrors, employees] = await Promise.all([
    getAllUsers(),
    listAudit(AUDIT_FETCH),
    fetchHiredThisMonth(),
    fetchSystemErrors(),
    fetchEmployees(),
  ]);

  const activeUsers = users.filter((u) => u.status === "ACTIVE");
  const roleCounts: RoleCount[] = ROLE_ORDER.map((role) => ({
    id: role.toLowerCase(),
    role: ROLE_LABELS[role],
    count: activeUsers.filter((u) => u.role === role).length,
  }));

  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  const logGroups = groupByDay(toLogEntries(auditRows, userMap).slice(0, LOG_LIMIT));

  return {
    stats: {
      totalUsers: activeUsers.length,
      newUsersThisCycle: users.filter((u) => hiredThisMonth.has(u.employeeId)).length,
      // TODO: รอตารางคำขอเบิกสวัสดิการ (welfare claim/request) ก่อนนับคำขอที่รอ HR
      hrRequests: mockStats.hrRequests,
      // TODO: รอตารางแจ้งเตือน (notification) ก่อนนับจากฐานข้อมูล
      notifications: mockStats.notifications,
      systemErrors,
    },
    roleCounts,
    employees,
    logGroups,
  };
}
