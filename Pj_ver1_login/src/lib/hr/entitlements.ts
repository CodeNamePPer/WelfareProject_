import "server-only";
import { supabaseAdmin } from "../supabase";
import { welfareItems } from "../../data/mock";
import type { HrEmployee } from "./employees";

/**
 * สิทธิสวัสดิการของพนักงานหนึ่งคน
 * อ่านจากตารางสวัสดิการจริง (v_welfare_benefit_current + welfare_benefit_department)
 * ถ้าฐานข้อมูลยังไม่มีตาราง (migration 20261104090000 ยังไม่ได้ติดตั้ง) จะใช้รายการเดียวกับหน้า /admin/benefits
 * และบอกหน้าจอว่าเป็นข้อมูลตัวอย่าง
 * ยอดที่ใช้ไปยังไม่มีแหล่งข้อมูล เพราะยังไม่มีตารางคำขอเบิก (claims)
 */
export type BudgetLabel = "ต่อปี" | "ต่อเดือน" | "ต่อครั้ง";

export interface Entitlement {
  code: string;
  name: string;
  budget: BudgetLabel;
  /** วงเงินที่ใช้วันนี้ (null = ยังไม่ได้กำหนด) */
  limit: number | null;
  /** วงเงินใหม่ที่ประกาศไว้ล่วงหน้า */
  nextLimit: { amount: number; from: string } | null;
  /** จำนวนครั้งที่เบิกได้ (ข้อความพร้อมแสดง) */
  claims: string;
  eligible: boolean;
  /** เหตุผลเมื่อไม่มีสิทธิ์ หรือเงื่อนไขพิเศษ */
  note: string | null;
}

export type EntitlementResult = { source: "database" | "sample"; items: Entitlement[] };

type BenefitRow = {
  id: string;
  code: string;
  name_th: string;
  budget_type: "yearly" | "monthly" | "per_claim";
  max_claims: number | null;
  max_claims_note: string | null;
  current_amount: number | string | null;
  next_amount: number | string | null;
  next_effective_from: string | null;
};

type DepartmentRow = { benefit_id: string; department: { name_th: string } | null };

const DB_BUDGET: Record<BenefitRow["budget_type"], BudgetLabel> = { yearly: "ต่อปี", monthly: "ต่อเดือน", per_claim: "ต่อครั้ง" };
const toNumber = (value: number | string | null) => (value === null ? null : Number(value));

/** ฐานข้อมูลยังไม่มีตาราง/วิวนี้ (PostgREST: PGRST205 / Postgres: 42P01) */
function isMissingTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

function applyStatus(employee: HrEmployee, eligible: boolean, note: string | null): { eligible: boolean; note: string | null } {
  if (employee.status !== "ACTIVE") return { eligible: false, note: `พนักงาน${employee.statusLabel} ไม่มีสิทธิ์` };
  return { eligible, note };
}

function fromSample(employee: HrEmployee): Entitlement[] {
  return welfareItems
    .filter((item) => item.status === "active")
    .map((item) => {
      const budget: BudgetLabel = item.budgetType === "รายเดือน" ? "ต่อเดือน" : item.budgetType === "ต่อครั้ง" ? "ต่อครั้ง" : "ต่อปี";
      const status = applyStatus(employee, true, item.eligible ? `เงื่อนไข: ${item.eligible}` : null);
      return {
        code: item.code,
        name: item.name,
        budget,
        limit: item.amount,
        nextLimit: null,
        claims: item.maxClaims || "ไม่จำกัด",
        ...status,
      };
    });
}

/** คืน null เมื่อโหลดไม่สำเร็จด้วยเหตุอื่น ให้หน้าจอแจ้งตามจริงแทนการแสดงรายการว่าง */
export async function getEntitlements(employee: HrEmployee): Promise<EntitlementResult | null> {
  try {
    const [benefits, departments] = await Promise.all([
      supabaseAdmin
        .from("v_welfare_benefit_current")
        .select("id, code, name_th, budget_type, max_claims, max_claims_note, current_amount, next_amount, next_effective_from")
        .eq("is_active", true)
        .order("code", { ascending: true }),
      supabaseAdmin.from("welfare_benefit_department").select("benefit_id, department:department_id(name_th)"),
    ]);
    if (isMissingTable(benefits.error)) return { source: "sample", items: fromSample(employee) };
    if (benefits.error) throw benefits.error;
    if (departments.error && !isMissingTable(departments.error)) throw departments.error;

    // สวัสดิการที่จำกัดแผนก: benefit_id -> ชื่อแผนกที่มีสิทธิ์ (ไม่มีแถว = ทุกแผนก)
    const allowed = new Map<string, string[]>();
    for (const row of (departments.data ?? []) as unknown as DepartmentRow[]) {
      if (!row.department) continue;
      allowed.set(row.benefit_id, [...(allowed.get(row.benefit_id) ?? []), row.department.name_th]);
    }

    const items = (benefits.data as BenefitRow[]).map((row) => {
      const onlyFor = allowed.get(row.id);
      // แผนกย่อยได้สิทธิ์ตามฝ่ายแม่ เช่น แผนกพัฒนาระบบอยู่ใต้ฝ่ายเทคโนโลยีสารสนเทศ
      const inDepartment = !onlyFor || onlyFor.includes(employee.department ?? "") || onlyFor.includes(employee.parentDepartment ?? "");
      const status = applyStatus(
        employee,
        inDepartment,
        onlyFor ? `เฉพาะ${onlyFor.join(", ")}${inDepartment ? "" : " จึงไม่มีสิทธิ์"}` : null,
      );
      const nextAmount = toNumber(row.next_amount);
      const budget = DB_BUDGET[row.budget_type];
      return {
        code: row.code,
        name: row.name_th,
        budget,
        limit: toNumber(row.current_amount),
        nextLimit: nextAmount !== null && row.next_effective_from ? { amount: nextAmount, from: row.next_effective_from } : null,
        claims: row.max_claims !== null ? `${row.max_claims} ครั้ง${budget}` : row.max_claims_note ?? "ไม่จำกัด",
        ...status,
      };
    });
    return { source: "database", items };
  } catch (err) {
    console.error("[hr] getEntitlements failed", err);
    return null;
  }
}
