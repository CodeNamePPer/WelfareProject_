import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";

// หัวหน้า HR = หัวหน้าของฝ่ายทรัพยากรบุคคล (department.head_employee_id ของแผนกรหัส HRD)
// ยังไม่มีบทบาท HR_HEAD ในระบบ จึงอ่านจากโครงสร้างองค์กร เปลี่ยนหัวหน้าฝ่ายแล้วสิทธิ์ย้ายตามทันที
export const HR_DEPARTMENT_CODE = "HRD";

/** รหัสพนักงานของหัวหน้า HR คนปัจจุบัน (null = ยังไม่ได้ตั้งหัวหน้าฝ่าย หรือโหลดไม่สำเร็จ) */
export const getHrHeadCode = cache(async (): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("department")
    .select("head:head_employee_id(employee_code, deleted_at, employment_status)")
    .eq("code", HR_DEPARTMENT_CODE)
    .is("deleted_at", null)
    .maybeSingle<{ head: { employee_code: string; deleted_at: string | null; employment_status: string } | null }>();
  if (error) {
    console.error("[hr head] lookup failed", error);
    return null;
  }
  const head = data?.head;
  return head && !head.deleted_at && head.employment_status === "active" ? head.employee_code : null;
});

/** ผู้ที่ล็อกอินอยู่เป็นหัวหน้า HR หรือไม่ (ต้องมีบทบาท HR ด้วย) */
export async function isHrHead(session: { sub: string; role: string } | null): Promise<boolean> {
  if (!session || session.role !== "HR") return false;
  return (await getHrHeadCode()) === session.sub;
}
