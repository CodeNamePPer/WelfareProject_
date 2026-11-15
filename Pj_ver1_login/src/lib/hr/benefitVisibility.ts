import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// การแสดงสวัสดิการที่ใช้ไม่ได้ (ดีไซน์ HH3) คอลัมน์ welfare_benefit.unavailable_display
//   faded = พนักงานเห็นเป็นการ์ดสีเทา ยื่นคำขอไม่ได้ · hidden = ซ่อนจากพนักงาน
// ใช้ได้ไม่ได้ดูจาก: ปิดรับคำขอ (is_active = false) · ไม่มีวงเงินกลางที่มีผล · จำกัดแผนก

export type UnavailableDisplay = "faded" | "hidden";

type BenefitRow = {
  id: string;
  code: string;
  name_th: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  unavailable_display: UnavailableDisplay;
};

async function loadBenefits() {
  const [benefits, limits, restrictions] = await Promise.all([
    supabaseAdmin.from("welfare_benefit").select("id, code, name_th, description, category, is_active, unavailable_display").is("deleted_at", null).order("code").returns<BenefitRow[]>(),
    supabaseAdmin.from("v_welfare_benefit_current").select("id, current_amount").returns<{ id: string; current_amount: number | string | null }[]>(),
    supabaseAdmin.from("welfare_benefit_department").select("benefit_id, department_id, department:department_id(name_th)").returns<{ benefit_id: string; department_id: string; department: { name_th: string } | null }[]>(),
  ]);
  if (benefits.error) throw benefits.error;
  if (limits.error) throw limits.error;
  if (restrictions.error) throw restrictions.error;
  const limitOf = new Map((limits.data ?? []).map((row) => [row.id, Number(row.current_amount ?? 0)]));
  const departments = new Map<string, { ids: string[]; names: string[] }>();
  for (const row of restrictions.data ?? []) {
    const entry = departments.get(row.benefit_id) ?? { ids: [], names: [] };
    entry.ids.push(row.department_id);
    if (row.department?.name_th) entry.names.push(row.department.name_th);
    departments.set(row.benefit_id, entry);
  }
  return { benefits: benefits.data ?? [], limitOf, departments };
}

export type UnavailableBenefit = { code: string; name: string; reason: string; display: UnavailableDisplay };

/** HH3: สวัสดิการที่มีพนักงานบางคนหรือทุกคนใช้ไม่ได้ พร้อมเหตุผลและการแสดงที่ตั้งไว้ (null = โหลดไม่สำเร็จ) */
export async function listUnavailableBenefits(): Promise<UnavailableBenefit[] | null> {
  try {
    const { benefits, limitOf, departments } = await loadBenefits();
    return benefits.flatMap((benefit) => {
      const restricted = departments.get(benefit.id);
      const reason = !benefit.is_active
        ? "ปิดรับคำขอปีนี้"
        : !(limitOf.get(benefit.id)! > 0)
          ? "ปีนี้ไม่มีวงเงิน"
          : restricted
            ? `พนักงานนอก ${restricted.names.join(", ") || "แผนกที่กำหนด"}`
            : null;
      return reason ? [{ code: benefit.code, name: benefit.name_th, reason, display: benefit.unavailable_display }] : [];
    });
  } catch (err) {
    console.error("[hr visibility] load failed", err);
    return null;
  }
}

export async function setUnavailableDisplay(code: string, display: UnavailableDisplay) {
  const { data, error } = await supabaseAdmin.from("welfare_benefit").update({ unavailable_display: display }).eq("code", code).is("deleted_at", null).select("code").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("benefit not found");
}

export type FadedBenefit = { code: string; name: string; category: string; description: string | null; reason: string };

/** หน้าสิทธิ์สวัสดิการของพนักงาน: สวัสดิการที่คนนี้ใช้ไม่ได้และตั้งให้แสดงเป็นสีเทา (ไม่รวมที่ใช้ได้อยู่แล้ว) */
export async function getFadedBenefitsFor(employeeCode: string, usableCodes: string[]): Promise<FadedBenefit[]> {
  try {
    const { data: employee } = await supabaseAdmin
      .from("employee")
      .select("department_id, department:department_id(parent_department_id)")
      .eq("employee_code", employeeCode)
      .is("deleted_at", null)
      .maybeSingle<{ department_id: string | null; department: { parent_department_id: string | null } | null }>();
    const { benefits, limitOf, departments } = await loadBenefits();
    const usable = new Set(usableCodes);
    const mine = [employee?.department_id, employee?.department?.parent_department_id].filter(Boolean) as string[];
    return benefits.flatMap((benefit) => {
      if (usable.has(benefit.code) || benefit.unavailable_display !== "faded") return [];
      const restricted = departments.get(benefit.id);
      const reason = !benefit.is_active
        ? "ปิดรับคำขอปีนี้"
        : !(limitOf.get(benefit.id)! > 0)
          ? "ปีนี้ไม่มีวงเงิน"
          : restricted && !restricted.ids.some((id) => mine.includes(id))
            ? `เฉพาะ ${restricted.names.join(", ") || "แผนกที่กำหนด"}`
            : "คุณไม่มีสิทธิ์ใช้สวัสดิการนี้";
      return [{ code: benefit.code, name: benefit.name_th, category: benefit.category ?? "อื่น ๆ", description: benefit.description, reason }];
    });
  } catch (err) {
    console.error("[welfare] faded benefits failed", err);
    return [];
  }
}
