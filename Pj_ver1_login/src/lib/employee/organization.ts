import "server-only";
import { supabaseAdmin } from "../supabase";
import { employeeFullName, type EmployeeNameParts } from "./profile";

export interface OrgMember {
  id: string;
  /** มีเฉพาะแผนกของผู้ที่ล็อกอิน แผนกอื่นส่งแค่ตำแหน่งไปถึงเบราว์เซอร์ */
  name?: string;
  role: string;
  isCurrentUser?: boolean;
}

export interface OrgDepartment {
  id: string;
  name: string;
  summary: string;
  /** มีเฉพาะแผนกของผู้ที่ล็อกอิน */
  head: { name: string; isMyManager: boolean; isMe: boolean } | null;
  employees: OrgMember[];
}

export interface Organization {
  ownDepartmentId: string | null;
  departments: OrgDepartment[];
}

interface DepartmentRow {
  id: string;
  name_th: string;
  head_employee_id: string | null;
  parent: { name_th: string } | null;
}

interface EmployeeRow extends EmployeeNameParts {
  id: string;
  employee_code: string;
  department_id: string | null;
  manager_employee_id: string | null;
  position: { name_th: string } | null;
}

const NO_POSITION = "ยังไม่ระบุตำแหน่ง";

/**
 * โครงสร้างหน่วยงานจากตาราง department / employee (code = session.sub)
 * อ่านด้วย service role จึงตัดชื่อพนักงานแผนกอื่นตั้งแต่ฝั่ง server
 * คืน null เมื่อโหลดไม่สำเร็จ
 */
export async function getOrganization(code: string): Promise<Organization | null> {
  try {
    const [departments, employees] = await Promise.all([
      supabaseAdmin
        .from("department")
        .select("id, name_th, head_employee_id, parent:parent_department_id(name_th)")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("code")
        .returns<DepartmentRow[]>(),
      supabaseAdmin
        .from("employee")
        .select("id, employee_code, title_th, first_name_th, last_name_th, department_id, manager_employee_id, position:position_id(name_th)")
        .eq("employment_status", "active")
        .is("deleted_at", null)
        .order("employee_code")
        .returns<EmployeeRow[]>(),
    ]);
    if (departments.error) throw departments.error;
    if (employees.error) throw employees.error;

    const people = employees.data ?? [];
    const me = people.find((person) => person.employee_code === code) ?? null;

    const result = (departments.data ?? []).map((department): OrgDepartment => {
      const members = people.filter((person) => person.department_id === department.id);
      const headRow = people.find((person) => person.id === department.head_employee_id) ?? null;
      // หัวหน้าแสดงแยกด้านบน จึงไม่ซ้ำในตาราง
      const staff = members.filter((person) => person.id !== headRow?.id);
      const isOwn = me?.department_id === department.id;
      const parent = department.parent ? `ภายใต้${department.parent.name_th} · ` : "";

      return {
        id: department.id,
        name: department.name_th,
        summary: `${parent}พนักงาน ${members.length} คน`,
        head:
          isOwn && headRow
            ? { name: employeeFullName(headRow), isMyManager: me.manager_employee_id === headRow.id, isMe: me.id === headRow.id }
            : null,
        employees: isOwn
          ? staff.map((person) => ({
              id: person.employee_code,
              name: employeeFullName(person),
              role: person.position?.name_th ?? NO_POSITION,
              isCurrentUser: person.id === me.id,
            }))
          : [...new Set(staff.map((person) => person.position?.name_th ?? NO_POSITION))].map((role) => ({ id: role, role })),
      };
    });

    return { ownDepartmentId: result.some((d) => d.id === me?.department_id) ? (me?.department_id ?? null) : null, departments: result };
  } catch (err) {
    console.error("[employee] load organization failed", err);
    return null;
  }
}
