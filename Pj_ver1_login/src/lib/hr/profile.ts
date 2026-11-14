import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// ข้อมูลเพิ่มของหน้าโปรไฟล์ HR / หัวหน้า HR (ดีไซน์ P01, P02) อ่านอย่างเดียว

export type HrProfileExtras = {
  loginEmail: string | null;
  /** วันเริ่มงาน YYYY-MM-DD */
  hireDate: string | null;
  /** จำนวนลูกน้องโดยตรงที่ยังทำงานอยู่ */
  directReports: number;
  /** เป็นหัวหน้าของแผนกใดแผนกหนึ่ง */
  departmentHead: boolean;
  /** วันที่ได้รับบทบาท HR (ISO) */
  hrGrantedAt: string | null;
  /** การตรวจคำขอของเดือนนี้ */
  review: { total: number; approved: number; returned: number; rejected: number; averageDays: number | null };
  /** สำหรับหัวหน้า HR */
  proposals: { pending: number; fromHr: number; fromAdmin: number; approvedThisYear: number; activeBenefits: number };
  logins: { at: string; ip: string | null }[];
};

const TZ = "Asia/Bangkok";

export async function getHrProfileExtras(code: string): Promise<HrProfileExtras | null> {
  try {
    const { data: me, error } = await supabaseAdmin.from("employee").select("id, hire_date").eq("employee_code", code).is("deleted_at", null).maybeSingle();
    if (error || !me) throw error ?? new Error("employee not found");
    const id = me.id as string;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
    const monthStart = `${today.slice(0, 7)}-01T00:00:00+07:00`;
    const yearStart = `${today.slice(0, 4)}-01-01T00:00:00+07:00`;

    const [account, reports, headOf, role, events, pending, approved, active, logins] = await Promise.all([
      supabaseAdmin.from("v_app_user").select("email").eq("employee_id", code).maybeSingle(),
      supabaseAdmin.from("employee").select("id", { count: "exact", head: true }).eq("manager_employee_id", id).eq("employment_status", "active").is("deleted_at", null),
      supabaseAdmin.from("department").select("id", { count: "exact", head: true }).eq("head_employee_id", id).is("deleted_at", null),
      supabaseAdmin.from("user_role").select("granted_at, role:role_id!inner(code)").eq("employee_id", id).eq("role.code", "HR").is("revoked_at", null).limit(1),
      supabaseAdmin
        .from("welfare_claim_event")
        .select("claim_id, kind, created_at")
        .eq("actor_employee_id", id)
        .in("kind", ["hr_approved", "revision_requested", "rejected"])
        .gte("created_at", monthStart)
        .returns<{ claim_id: string; kind: string; created_at: string }[]>(),
      supabaseAdmin.from("welfare_benefit_proposal").select("proposer_role").eq("status", "pending").is("deleted_at", null),
      supabaseAdmin.from("welfare_benefit_proposal").select("id", { count: "exact", head: true }).eq("status", "approved").gte("decided_at", yearStart).is("deleted_at", null),
      supabaseAdmin.from("welfare_benefit").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
      supabaseAdmin.from("audit_logs").select("created_at, ip_address").eq("action", "LOGIN_SUCCESS").eq("user_id", code).order("created_at", { ascending: false }).limit(3),
    ]);

    // เวลาตรวจเฉลี่ย: จากครั้งที่ยื่น/ยื่นใหม่ล่าสุดก่อนการตัดสิน ถึงเวลาที่ตัดสิน
    const decided = events.data ?? [];
    let averageDays: number | null = null;
    if (decided.length > 0) {
      const { data: submits } = await supabaseAdmin
        .from("welfare_claim_event")
        .select("claim_id, created_at")
        .in("claim_id", [...new Set(decided.map((event) => event.claim_id))])
        .in("kind", ["submitted", "resubmitted"])
        .returns<{ claim_id: string; created_at: string }[]>();
      const waits = decided.flatMap((event) => {
        const before = (submits ?? []).filter((item) => item.claim_id === event.claim_id && item.created_at <= event.created_at).map((item) => item.created_at);
        if (before.length === 0) return [];
        const start = before.reduce((max, value) => (value > max ? value : max));
        return [(new Date(event.created_at).getTime() - new Date(start).getTime()) / 86_400_000];
      });
      if (waits.length > 0) averageDays = waits.reduce((sum, value) => sum + value, 0) / waits.length;
    }
    const count = (kind: string) => decided.filter((event) => event.kind === kind).length;
    const pendingRows = (pending.data ?? []) as { proposer_role: string }[];

    return {
      loginEmail: (account.data?.email as string | undefined) ?? null,
      hireDate: (me.hire_date as string | null) ?? null,
      directReports: reports.count ?? 0,
      departmentHead: (headOf.count ?? 0) > 0,
      hrGrantedAt: (role.data?.[0]?.granted_at as string | undefined) ?? null,
      review: { total: decided.length, approved: count("hr_approved"), returned: count("revision_requested"), rejected: count("rejected"), averageDays },
      proposals: {
        pending: pendingRows.length,
        fromHr: pendingRows.filter((row) => row.proposer_role === "HR").length,
        fromAdmin: pendingRows.filter((row) => row.proposer_role === "SUPER_ADMIN").length,
        approvedThisYear: approved.count ?? 0,
        activeBenefits: active.count ?? 0,
      },
      logins: (logins.data ?? []).map((row) => ({ at: row.created_at as string, ip: (row.ip_address as string | null) ?? null })),
    };
  } catch (err) {
    console.error("[hr profile] load failed", err);
    return null;
  }
}
