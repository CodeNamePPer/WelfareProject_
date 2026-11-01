import "server-only";
import { supabaseAdmin } from "../supabase";
import { listAudit } from "../auth/audit";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { getAllUsers } from "../auth/users";
import { toLogEntries } from "../../features/logs/fromAuditLog";
import { summaryStats as mockStats } from "../../data/mock";
import { countUnread, getAdminAlerts } from "./alerts";
import type { AuditEntry, Employee, RoleCount, SummaryStats } from "../../types";

/**
 * ข้อมูลหน้า Admin Dashboard จาก Supabase (เรียกฝั่ง server เท่านั้น)
 * ส่วนสวัสดิการ/คำขอเบิก/แจ้งเตือนยังใช้ mock เพราะยังไม่มีตาราง
 */
export interface AdminDashboardData {
  stats: SummaryStats;
  /** null = โหลดรายชื่อผู้ใช้ไม่สำเร็จ */
  roleCounts: RoleCount[] | null;
  employees: Employee[];
  logEntries: AuditEntry[];
}

const TZ = "Asia/Bangkok";
const ROLE_ORDER: Role[] = ["SUPER_ADMIN", "HR", "FINANCE", "EMPLOYEE"];
const LOG_LIMIT = 5;
// listAudit คืนทุก action แต่ตัวแปลงตัดล็อกอิน/ออกสำเร็จทิ้ง จึงดึงเผื่อไว้แล้วค่อยตัดเหลือ LOG_LIMIT
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

/** คืน null เมื่อดึงข้อมูลไม่สำเร็จ เพื่อให้หน้าจอแสดงสถานะ "โหลดไม่สำเร็จ" แทนตัวเลขปลอม */
async function safe<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    console.error(`[admin dashboard] ${label} failed`, err);
    return null;
  }
}

/** รหัสพนักงานที่เริ่มงานในเดือนนี้ */
function fetchHiredThisMonth(): Promise<Set<string> | null> {
  return safe("hired this month", async () => {
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

function fetchSystemErrors(): Promise<number | null> {
  return safe("system errors", async () => {
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

function fetchEmployees(): Promise<Employee[] | null> {
  return safe("employees", async () => {
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

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  // getAllUsers / listAudit จัดการ error เองแล้ว (log และคืน [])
  const [users, auditRows, hiredThisMonth, systemErrors, employees] = await Promise.all([
    getAllUsers(),
    listAudit(AUDIT_FETCH),
    fetchHiredThisMonth(),
    fetchSystemErrors(),
    fetchEmployees(),
  ]);

  // getAllUsers กลืน error แล้วคืน [] – แต่ผู้เปิดหน้านี้คือ Admin ที่ล็อกอินอยู่ จึงต้องมีผู้ใช้อย่างน้อย 1 คนเสมอ
  // รายชื่อว่างจึงหมายถึงโหลดไม่สำเร็จ ไม่ใช่ "ไม่มีผู้ใช้"
  const usersLoaded = users.length > 0;
  const activeUsers = users.filter((u) => u.status === "ACTIVE");
  const roleCounts: RoleCount[] | null = usersLoaded
    ? ROLE_ORDER.map((role) => ({
        id: role.toLowerCase(),
        role: ROLE_LABELS[role],
        count: activeUsers.filter((u) => u.role === role).length,
      }))
    : null;

  const userMap = new Map(users.map((u) => [u.employeeId, { name: u.name, role: u.role }]));
  const logEntries = toLogEntries(auditRows, userMap).slice(0, LOG_LIMIT);

  return {
    stats: {
      totalUsers: usersLoaded ? activeUsers.length : null,
      newUsersThisCycle:
        usersLoaded && hiredThisMonth ? users.filter((u) => hiredThisMonth.has(u.employeeId)).length : null,
      // TODO: รอตารางคำขอเบิกสวัสดิการ (welfare claim/request) ก่อนนับคำขอที่รอ HR
      hrRequests: mockStats.hrRequests,
      // ตัวเลขเดียวกับ badge ใน sidebar และ "ยังไม่อ่าน" ในหน้าแจ้งเตือน
      notifications: countUnread(getAdminAlerts()),
      systemErrors,
    },
    roleCounts,
    employees: employees ?? [],
    logEntries,
  };
}
