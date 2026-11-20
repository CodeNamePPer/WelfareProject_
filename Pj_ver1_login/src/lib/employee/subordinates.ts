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

const MEMBER_COLUMNS = "employee_code, title_th, first_name_th, last_name_th, department:department_id(name_th), position:position_id(name_th)";

/**
 * พนักงานที่ยื่นคำขอแทนได้ ยื่นแทนได้เฉพาะหัวหน้าแผนก (department.head_employee_id)
 * และเฉพาะพนักงานในแผนกที่ตัวเองเป็นหัวหน้า ไม่รวมตัวเอง และเฉพาะคนที่ยังทำงานอยู่
 * ลูกน้องโดยตรงจากช่อง "หัวหน้า" (manager_employee_id) ที่อยู่แผนกอื่นยื่นแทนไม่ได้
 * คืน [] เมื่อไม่ได้เป็นหัวหน้าแผนกใด และ null เมื่อโหลดไม่สำเร็จ
 * ใช้ทั้งฟอร์มยื่นคำขอและตอนบันทึกคำขอ (lib/claims/service.ts) ให้กฎตรงกัน
 */
export const getSubordinates = cache(async (headCode: string): Promise<Subordinate[] | null> => {
  try {
    const { data: head, error: headError } = await supabaseAdmin.from("employee").select("id").eq("employee_code", headCode).is("deleted_at", null).maybeSingle();
    if (headError) throw headError;
    if (!head) return [];

    const { data: departments, error: departmentError } = await supabaseAdmin.from("department").select("id").eq("head_employee_id", head.id).is("deleted_at", null);
    if (departmentError) throw departmentError;
    const departmentIds = (departments ?? []).map((department) => department.id as string);
    if (!departmentIds.length) return [];

    const { data, error } = await supabaseAdmin
      .from("employee")
      .select(MEMBER_COLUMNS)
      .in("department_id", departmentIds)
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
    console.error("[employee] load subordinates failed", err);
    return null;
  }
});
