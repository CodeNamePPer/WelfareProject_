import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// วงเงินรายคน: แถวใน welfare_benefit_limit ที่มี employee_id (migration 20261114130000)
// ตอนยื่นคำขอ guard_welfare_claim() ใช้วงเงินรายคนก่อนวงเงินกลางของสวัสดิการ

export type EmployeeLimit = { amount: number; effectiveFrom: string; reason: string | null };
export type EmployeeLimits = Map<string, { current: EmployeeLimit | null; next: EmployeeLimit | null }>;

type Row = { amount: number | string; effective_from: string; reason: string | null; benefit: { code: string } | null };

const bangkokToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

/** วงเงินรายคนที่มีผลวันนี้ และที่ตั้งไว้ล่วงหน้า แยกตามรหัสสวัสดิการ คืน null เมื่อโหลดไม่สำเร็จ */
export async function getEmployeeLimits(employeeCode: string): Promise<EmployeeLimits | null> {
  const { data: employee, error: employeeError } = await supabaseAdmin.from("employee").select("id").eq("employee_code", employeeCode).maybeSingle();
  if (employeeError || !employee) return null;
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit_limit")
    .select("amount, effective_from, reason, benefit:benefit_id(code)")
    .eq("employee_id", employee.id)
    .order("effective_from", { ascending: true })
    .returns<Row[]>();
  if (error) {
    console.error("[hr employee limits] load failed", error);
    return null;
  }
  const today = bangkokToday();
  const result: EmployeeLimits = new Map();
  for (const row of data ?? []) {
    if (!row.benefit) continue;
    const entry = result.get(row.benefit.code) ?? { current: null, next: null };
    const limit = { amount: Number(row.amount), effectiveFrom: row.effective_from, reason: row.reason };
    // เรียงตามวันที่มีผลจากเก่าไปใหม่: แถวล่าสุดที่ถึงวันแล้ว = ปัจจุบัน, แถวแรกที่ยังไม่ถึง = ถัดไป
    if (row.effective_from <= today) entry.current = limit;
    else if (!entry.next) entry.next = limit;
    result.set(row.benefit.code, entry);
  }
  return result;
}

export class LimitInputError extends Error {
  constructor(
    message: string,
    readonly field: "amount" | "effectiveFrom" | "reason" | "benefit",
  ) {
    super(message);
  }
}

/** เพิ่มวงเงินรายคน 1 แถว (ปรับวงเงิน = เพิ่มแถวใหม่ ไม่แก้แถวเดิม) */
export async function saveEmployeeLimit(input: { employeeCode: string; benefitCode: string; amount: number; effectiveFrom: string; reason: string }) {
  const today = bangkokToday();
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new LimitInputError("วงเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "amount");
  if (Math.round(input.amount * 100) !== input.amount * 100) throw new LimitInputError("วงเงินมีทศนิยมได้ไม่เกิน 2 ตำแหน่ง", "amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) throw new LimitInputError("เลือกวันที่มีผล", "effectiveFrom");
  // ย้อนหลังไม่ได้ เพราะคำขอที่ยื่นไปแล้วอ้างวงเงินเดิมอยู่
  if (input.effectiveFrom < today) throw new LimitInputError("วันที่มีผลต้องเป็นวันนี้หรือหลังจากนี้", "effectiveFrom");
  if (!input.reason.trim()) throw new LimitInputError("ระบุเหตุผลที่ปรับวงเงิน", "reason");

  const [{ data: employee }, { data: benefit }] = await Promise.all([
    supabaseAdmin.from("employee").select("id, employment_status").eq("employee_code", input.employeeCode).is("deleted_at", null).maybeSingle(),
    supabaseAdmin.from("welfare_benefit").select("id, is_active").eq("code", input.benefitCode).is("deleted_at", null).maybeSingle(),
  ]);
  if (!employee) throw new LimitInputError("ไม่พบพนักงาน", "benefit");
  if (employee.employment_status !== "active") throw new LimitInputError("พนักงานที่พ้นสภาพไม่มีสิทธิ์เบิก จึงปรับวงเงินไม่ได้", "benefit");
  if (!benefit || !benefit.is_active) throw new LimitInputError("สวัสดิการนี้ปิดรับคำขอแล้ว", "benefit");

  const { error } = await supabaseAdmin.from("welfare_benefit_limit").insert({
    benefit_id: benefit.id,
    employee_id: employee.id,
    amount: input.amount,
    effective_from: input.effectiveFrom,
    reason: input.reason.trim(),
  });
  if (error) {
    if (error.code === "23505") throw new LimitInputError("มีวงเงินรายคนที่มีผลวันเดียวกันอยู่แล้ว เลือกวันที่อื่น", "effectiveFrom");
    throw error;
  }
}
