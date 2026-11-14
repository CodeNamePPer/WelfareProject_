import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { getHrHeadCode } from "@/lib/hr/hrHead";

// โครงสร้างองค์กร (ดีไซน์ H11): พนักงานที่ยังทำงานอยู่ เรียงตามสายบังคับบัญชา (manager_employee_id)

export type OrgPerson = {
  code: string;
  name: string;
  position: string | null;
  department: string | null;
  /** รหัสระดับ เช่น L1 */
  level: string | null;
  levelName: string | null;
  managerCode: string | null;
  /** ชื่อแผนกที่คนนี้เป็นหัวหน้า (ว่าง = ไม่ได้เป็นหัวหน้าแผนก) */
  headOf: string[];
  hrHead: boolean;
};

type Row = {
  id: string;
  employee_code: string;
  first_name_th: string;
  last_name_th: string;
  department: { name_th: string } | null;
  position: { name_th: string } | null;
  job_level: { code: string; name_th: string } | null;
  manager: { employee_code: string; employment_status: string; deleted_at: string | null } | null;
};

/** คืน null เมื่อโหลดไม่สำเร็จ */
export async function getOrgPeople(): Promise<OrgPerson[] | null> {
  try {
    const [employees, departments, hrHead] = await Promise.all([
      supabaseAdmin
        .from("employee")
        .select(
          "id, employee_code, first_name_th, last_name_th, department:department_id(name_th), position:position_id(name_th), job_level:job_level_id(code, name_th), manager:manager_employee_id(employee_code, employment_status, deleted_at)",
        )
        .eq("employment_status", "active")
        .is("deleted_at", null)
        .order("employee_code", { ascending: true })
        .returns<Row[]>(),
      supabaseAdmin.from("department").select("name_th, head_employee_id").is("deleted_at", null).not("head_employee_id", "is", null),
      getHrHeadCode(),
    ]);
    if (employees.error) throw employees.error;
    if (departments.error) throw departments.error;
    const headOf = new Map<string, string[]>();
    for (const row of departments.data ?? []) headOf.set(row.head_employee_id as string, [...(headOf.get(row.head_employee_id as string) ?? []), row.name_th as string]);
    return (employees.data ?? []).map((row) => ({
      code: row.employee_code,
      name: `${row.first_name_th} ${row.last_name_th === "-" ? "" : row.last_name_th}`.trim(),
      position: row.position?.name_th ?? null,
      department: row.department?.name_th ?? null,
      level: row.job_level?.code ?? null,
      levelName: row.job_level?.name_th ?? null,
      // หัวหน้าที่ลาออก/ถูกลบแล้วไม่แสดง ลูกน้องจึงขึ้นเป็นระดับบนสุด
      managerCode: row.manager && !row.manager.deleted_at && row.manager.employment_status === "active" ? row.manager.employee_code : null,
      headOf: headOf.get(row.id) ?? [],
      hrHead: row.employee_code === hrHead,
    }));
  } catch (err) {
    console.error("[hr org chart] load failed", err);
    return null;
  }
}
