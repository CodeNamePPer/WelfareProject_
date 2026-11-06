import "server-only";
import { supabaseAdmin } from "../supabase";
import { listAudit } from "../auth/audit";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { getAllUsers } from "../auth/users";
import { toLogEntries } from "../../features/logs/fromAuditLog";
// TODO: claims ยังเป็น mock รอตารางคำขอเบิกสวัสดิการ
import { claims } from "../../data/mock";
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
const TREND_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// กันดึงแถวมากเกินไปถ้ามีการยิงล็อกอินผิดจำนวนมาก
const LOGIN_FETCH_LIMIT = 5000;

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

/** วันที่ (เวลาไทย) ของ TREND_DAYS วันล่าสุด เก่าสุดก่อน – ตัวสุดท้ายคือวันนี้ */
function trendDays(): string[] {
  const now = Date.now();
  return Array.from({ length: TREND_DAYS }, (_, i) => bangkokDate(new Date(now - (TREND_DAYS - 1 - i) * DAY_MS)));
}

/** ล็อกอินสำเร็จ (นับคนไม่ซ้ำต่อวัน) และล็อกอินผิดพลาด (นับครั้ง) ใน 7 วันล่าสุด */
function fetchLoginActivity(): Promise<Pick<SummaryStats, "logins" | "loginErrors"> | null> {
  return safe("login activity", async () => {
    const days = trendDays();
    // เที่ยงคืนเวลาไทยของวันแรก
    const since = new Date(`${days[0]}T00:00:00+07:00`).toISOString();
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("action, user_id, created_at")
      .or("action.eq.LOGIN_SUCCESS,action.like.LOGIN_BLOCKED%,action.like.LOGIN_FAILED%")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LOGIN_FETCH_LIMIT);
    if (error) throw error;

    const dayIndex = new Map(days.map((day, i) => [day, i]));
    const loginUsers = days.map(() => new Set<string>());
    const errorsDaily = days.map(() => 0);
    let failed = 0;
    let blocked = 0;
    let lastAt: string | null = null;

    for (const row of data) {
      const i = dayIndex.get(bangkokDate(new Date(row.created_at)));
      if (i === undefined) continue;
      if (row.action === "LOGIN_SUCCESS") {
        if (row.user_id) loginUsers[i].add(row.user_id);
        continue;
      }
      errorsDaily[i] += 1;
      if (row.action === "LOGIN_FAILED") failed += 1;
      else blocked += 1;
      // เรียงใหม่สุดก่อน แถวแรกที่เจอจึงเป็นครั้งล่าสุด
      lastAt ??= row.created_at;
    }

    const loginsDaily = loginUsers.map((set) => set.size);
    return {
      logins: { today: loginsDaily[loginsDaily.length - 1], daily: loginsDaily },
      loginErrors: { failed, blocked, daily: errorsDaily, lastAt },
    };
  });
}

/** คิวคำขอเบิกของ HR – ตอนนี้คำนวณจาก mock claims */
function hrQueueStats(): SummaryStats["hrQueue"] {
  // คำขอ pending ที่ HR อนุมัติแล้วกำลังรอการเงิน ไม่ใช่คิวของ HR
  const atHr = (c: (typeof claims)[number]) => !c.timeline.some((e) => e.kind === "hr-approved");
  const allPending = claims.filter((c) => c.status === "pending");
  const pending = allPending.filter(atHr);
  const today = new Date(`${bangkokDate()}T00:00:00Z`).getTime();
  const ages = pending.map((c) => Math.round((today - new Date(`${c.date}T00:00:00Z`).getTime()) / DAY_MS));
  return {
    pending: pending.length,
    atFinance: allPending.length - pending.length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
    oldestPendingDays: ages.length ? Math.max(...ages) : null,
  };
}

function fetchEmployees(): Promise<Employee[] | null> {
  return safe("employees", async () => {
    const [{ data, error }, departments] = await Promise.all([
      supabaseAdmin
        .from("employee")
        .select("employee_code, first_name_th, last_name_th, department_id")
        .eq("employment_status", "active")
        .is("deleted_at", null)
        .order("employee_code", { ascending: true }),
      // ชื่อแผนกใช้ค้นหาในตัวเลือกพนักงาน – โหลดไม่ได้ก็ยังค้นด้วยชื่อ/รหัสได้
      supabaseAdmin.from("department").select("id, name_th"),
    ]);
    if (error) throw error;
    const departmentName = new Map((departments.data ?? []).map((d) => [d.id as string, d.name_th as string]));
    return data.map((row) => {
      const last = row.last_name_th?.trim();
      const name = [row.first_name_th?.trim(), last && last !== "-" ? last : null].filter(Boolean).join(" ");
      const department = row.department_id ? departmentName.get(row.department_id) : undefined;
      return { id: row.employee_code, code: row.employee_code, name, department };
    });
  });
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  // getAllUsers / listAudit จัดการ error เองแล้ว (log และคืน [])
  const [users, auditRows, hiredThisMonth, loginActivity, employees] = await Promise.all([
    getAllUsers(),
    listAudit(AUDIT_FETCH),
    fetchHiredThisMonth(),
    fetchLoginActivity(),
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
      users: usersLoaded
        ? {
            active: activeUsers.length,
            inactive: users.length - activeUsers.length,
            resigned: users.filter((u) => u.status === "RESIGNED").length,
            deceased: users.filter((u) => u.status === "DECEASED").length,
            newThisMonth: hiredThisMonth ? users.filter((u) => hiredThisMonth.has(u.employeeId)).length : null,
          }
        : null,
      hrQueue: hrQueueStats(),
      logins: loginActivity?.logins ?? null,
      loginErrors: loginActivity?.loginErrors ?? null,
    },
    roleCounts,
    employees: employees ?? [],
    logEntries,
  };
}
