import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "../supabase";

export interface Subordinate {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface MemberRow {
  employee_code: string;
  title_th: string | null;
  first_name_th: string;
  last_name_th: string;
  department: { name_th: string } | null;
  position: { name_th: string } | null;
}

/**
 * พนักงานที่หัวหน้าแผนกยื่นคำขอแทนได้: ยื่นแทนได้เฉพาะคนที่เป็นหัวหน้าแผนก (department.head_employee_id)
 * และเฉพาะพนักงานที่ยังทำงานอยู่ในแผนกที่ตัวเองเป็นหัวหน้า ไม่รวมตัวเอง
 * คืน [] เมื่อไม่ได้เป็นหัวหน้าแผนก และ null เมื่อโหลดไม่สำเร็จ
 * ใช้ทั้งฟอร์มยื่นคำขอและตอนบันทึกคำขอ (lib/claims/service.ts) ให้กฎตรงกัน
 */
export const getSubordinates = cache(async (headCode: string): Promise<Subordinate[] | null> => {
  try {
    const { data: head, error: headError } = await supabaseAdmin.from("employee").select("id").eq("employee_code", headCode).is("deleted_at", null).maybeSingle();
    if (headError) throw headError;
    if (!head) return [];

    const { data: departments, error: departmentError } = await supabaseAdmin.from("department").select("id").eq("head_employee_id", head.id).is("deleted_at", null);
    if (departmentError) throw departmentError;
    if (!departments?.length) return [];

    const { data, error } = await supabaseAdmin
      .from("employee")
      .select("employee_code, title_th, first_name_th, last_name_th, department:department_id(name_th), position:position_id(name_th)")
      .in(
        "department_id",
        departments.map((department) => department.id),
      )
      .neq("id", head.id)
      .eq("employment_status", "active")
      .is("deleted_at", null)
      .order("employee_code")
      .returns<MemberRow[]>();
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.employee_code,
      name: `${row.title_th ?? ""}${row.first_name_th} ${row.last_name_th}`.trim(),
      department: row.department?.name_th ?? "-",
      position: row.position?.name_th ?? "-",
    }));
  } catch (err) {
    console.error("[employee] load department members failed", err);
    return null;
  }
});
