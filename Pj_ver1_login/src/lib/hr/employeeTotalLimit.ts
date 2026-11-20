import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { LimitInputError } from "@/lib/hr/employeeLimits";
import type { TotalCap } from "@/lib/claims/totalCap";

// วงเงินรวมต่อปีรายคน: ตาราง welfare_employee_total_limit (migration 20261121090000)
// ตอนยื่นคำขอ guard_welfare_claim() ตรวจเพดานนี้หลังวงเงินแยกสวัสดิการ amount = null หรือไม่มีแถว = ไม่จำกัด

export type TotalLimit = { amount: number | null; effectiveFrom: string; reason: string };
export type TotalLimits = { current: TotalLimit | null; next: TotalLimit | null };

type Row = { amount: number | string | null; effective_from: string; reason: string };

const bangkokToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
const toLimit = (row: Row): TotalLimit => ({ amount: row.amount === null ? null : Number(row.amount), effectiveFrom: row.effective_from, reason: row.reason });

async function employeeIdOf(employeeCode: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("employee").select("id").eq("employee_code", employeeCode).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** เพดานรวม (บาท) ที่มีผล ณ วันที่ระบุ null = ไม่จำกัด */
export async function totalLimitAt(employeeId: string, date: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_employee_total_limit")
    .select("amount")
    .eq("employee_id", employeeId)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<{ amount: number | string | null }>();
  if (error) throw error;
  return data?.amount === null || data?.amount === undefined ? null : Number(data.amount);
}

/** วงเงินรวมที่มีผลวันนี้ และที่ตั้งไว้ล่วงหน้า คืน null เมื่อโหลดไม่สำเร็จ */
export async function getEmployeeTotalLimit(employeeCode: string): Promise<TotalLimits | null> {
  try {
    const employeeId = await employeeIdOf(employeeCode);
    if (!employeeId) return null;
    const { data, error } = await supabaseAdmin
      .from("welfare_employee_total_limit")
      .select("amount, effective_from, reason")
      .eq("employee_id", employeeId)
      .order("effective_from", { ascending: true })
      .returns<Row[]>();
    if (error) throw error;
    const today = bangkokToday();
    const result: TotalLimits = { current: null, next: null };
    // เรียงจากเก่าไปใหม่: แถวล่าสุดที่ถึงวันแล้ว = ปัจจุบัน, แถวแรกที่ยังไม่ถึง = ถัดไป
    for (const row of data ?? []) {
      if (row.effective_from <= today) result.current = toLimit(row);
      else if (!result.next) result.next = toLimit(row);
    }
    return result;
  } catch (err) {
    console.error("[hr total limit] load failed", err);
    return null;
  }
}

/** เพดานรวมปีนี้ ยอดที่ใช้ไปหรือรอตรวจทุกสวัสดิการ และคงเหลือ คืน null เมื่อโหลดไม่สำเร็จ */
export async function getEmployeeTotalCap(employeeCode: string): Promise<TotalCap | null> {
  try {
    const employeeId = await employeeIdOf(employeeCode);
    if (!employeeId) return null;
    const today = bangkokToday();
    const [cap, usage] = await Promise.all([
      totalLimitAt(employeeId, today),
      supabaseAdmin.rpc("welfare_employee_year_usage", { p_employee: employeeId, p_year: Number(today.slice(0, 4)) }),
    ]);
    if (usage.error) throw usage.error;
    const used = Number(usage.data ?? 0);
    return { cap, used, remaining: cap === null ? null : Math.max(cap - used, 0) };
  } catch (err) {
    console.error("[hr total limit] usage failed", err);
    return null;
  }
}

/**
 * บันทึกวงเงินรวม amount = null คือยกเลิกเพดาน
 * วันที่มีผลใหม่ = เพิ่มแถว, วันที่มีผลซ้ำ (วันนี้หรือวันหลัง) = แก้ทับแถวเดิม แถวที่มีผลแล้วไม่ถูกแตะ
 */
export async function saveEmployeeTotalLimit(input: { employeeCode: string; amount: number | null; effectiveFrom: string; reason: string }) {
  const today = bangkokToday();
  if (input.amount !== null) {
    if (!Number.isFinite(input.amount) || input.amount < 0) throw new LimitInputError("วงเงินรวมต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "amount");
    if (Math.abs(Math.round(input.amount * 100) - input.amount * 100) > 1e-6) throw new LimitInputError("วงเงินรวมมีทศนิยมได้ไม่เกิน 2 ตำแหน่ง", "amount");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) throw new LimitInputError("เลือกวันที่มีผล", "effectiveFrom");
  // ย้อนหลังไม่ได้ เพราะคำขอที่ยื่นไปแล้วผ่านการตรวจด้วยเพดานเดิม
  if (input.effectiveFrom < today) throw new LimitInputError("วันที่มีผลต้องเป็นวันนี้หรือหลังจากนี้", "effectiveFrom");
  if (!input.reason.trim()) throw new LimitInputError("ระบุเหตุผลที่ปรับวงเงินรวม", "reason");

  const { data: employee } = await supabaseAdmin.from("employee").select("id, employment_status").eq("employee_code", input.employeeCode).is("deleted_at", null).maybeSingle();
  if (!employee) throw new LimitInputError("ไม่พบพนักงาน", "benefit");
  if (employee.employment_status !== "active") throw new LimitInputError("พนักงานที่พ้นสภาพไม่มีสิทธิ์เบิก จึงปรับวงเงินรวมไม่ได้", "benefit");

  const { error } = await supabaseAdmin.from("welfare_employee_total_limit").upsert(
    {
      employee_id: employee.id,
      amount: input.amount,
      effective_from: input.effectiveFrom,
      reason: input.reason.trim(),
    },
    { onConflict: "employee_id,effective_from" },
  );
  if (error) {
    if (error.code === "P0001") throw new LimitInputError(error.message, "effectiveFrom");
    throw error;
  }
}
