import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "../supabase";

export interface Subordinate {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface SubordinateRow {
  employee_code: string;
  title_th: string | null;
  first_name_th: string;
  last_name_th: string;
  department: { name_th: string } | null;
  position: { name_th: string } | null;
}

/**
 * ลูกน้องโดยตรงที่ยังทำงานอยู่ (employee.manager_employee_id) ใช้กำหนดสิทธิ์ "ยื่นคำขอแทนพนักงาน"
 * คืน null เมื่อโหลดไม่สำเร็จ เพื่อแยกจากกรณีไม่มีลูกน้องจริง ๆ
 * ใช้ cache เพราะ layout และหน้า /employee/HeadEm เรียกใน request เดียวกัน
 */
export const getSubordinates = cache(async (managerCode: string): Promise<Subordinate[] | null> => {
  try {
    // session.sub เป็น employee_code แต่ manager_employee_id เป็น uuid จึงกรองผ่านความสัมพันธ์ของหัวหน้า
    const { data, error } = await supabaseAdmin
      .from("employee")
      .select(
        "employee_code, title_th, first_name_th, last_name_th, department:department_id(name_th), position:position_id(name_th), manager:manager_employee_id!inner(employee_code)",
      )
      .eq("manager.employee_code", managerCode)
      .eq("employment_status", "active")
      .is("deleted_at", null)
      .order("employee_code")
      .returns<SubordinateRow[]>();
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
