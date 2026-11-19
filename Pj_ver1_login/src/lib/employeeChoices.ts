import type { UserWithProfile } from "@/lib/auth/users";

/** ใช้แค่ฟิลด์ที่ต้องการ ให้รับได้ทั้ง UserWithProfile ฝั่ง server และ User ของหน้า admin */
type ChoiceSource = Pick<UserWithProfile, "employeeId" | "name"> & {
  status: string;
  profile: { managerCode: string | null; departmentName: string | null; positionName: string | null };
};

export type EmployeeChoice = {
  value: string;
  label: string;
  disabled?: boolean;
  /** ชื่อแผนก ใช้จัดกลุ่มในช่องหัวหน้า */
  group?: string;
  position?: string;
  /** เป็นหัวหน้าแผนก (department.head_employee_id) ของแผนกใดแผนกหนึ่ง */
  isDeptHead?: boolean;
  /** รหัสหัวหน้าปัจจุบันของคนนี้ ใช้แสดงทีมของหัวหน้า */
  managerCode?: string;
};

/** ตัวเลือกพนักงานที่ยังทำงานอยู่ (ไม่รวมตัวเอง) สำหรับช่องหัวหน้า */
export function employeeChoices(users: ChoiceSource[], selfId: string, departments: { headCode?: string }[] = []): EmployeeChoice[] {
  const heads = new Set(departments.map((d) => d.headCode).filter(Boolean));
  return users
    .filter((u) => u.status === "ACTIVE" && u.employeeId !== selfId)
    .map((u) => ({
      value: u.employeeId,
      label: `${u.name} (${u.employeeId})`,
      group: u.profile.departmentName ?? undefined,
      position: u.profile.positionName ?? undefined,
      isDeptHead: heads.has(u.employeeId),
      managerCode: u.profile.managerCode ?? undefined,
    }));
}

/** ข้อความในตัวเลือก: ชื่อ (รหัส) · ตำแหน่ง · หัวหน้าแผนก */
export function choiceText(c: { label: string; position?: string; isDeptHead?: boolean }): string {
  return [c.label, c.position, c.isDeptHead ? "หัวหน้าแผนก" : null].filter(Boolean).join(" · ");
}

export const NO_DEPARTMENT = "ไม่ระบุแผนก";

/** จัดกลุ่มตามแผนก (เรียงชื่อแผนก ไม่ระบุแผนกไว้ท้าย) หัวหน้าแผนกขึ้นก่อนในแต่ละกลุ่ม */
export function groupByDepartment<T extends { group?: string; isDeptHead?: boolean }>(items: T[]): { group: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.group ?? NO_DEPARTMENT;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_DEPARTMENT ? 1 : b === NO_DEPARTMENT ? -1 : a.localeCompare(b, "th")))
    .map(([group, list]) => ({ group, items: [...list].sort((a, b) => Number(Boolean(b.isDeptHead)) - Number(Boolean(a.isDeptHead))) }));
}

type DepartmentNode = { id: string; parentId?: string; headCode?: string };

/**
 * หัวหน้าที่แนะนำตามโครงสร้างองค์กร: หัวหน้าของแผนกที่เลือก
 * ถ้าพนักงานคนนั้นเป็นหัวหน้าแผนกเอง (หรือแผนกยังไม่มีหัวหน้า) ไล่ขึ้นไปหาหัวหน้าของหน่วยงานแม่
 */
export function suggestManager(
  departments: DepartmentNode[],
  departmentId: string | null | undefined,
  selfCode?: string,
): string | undefined {
  const seen = new Set<string>();
  let dept = departments.find((d) => d.id === departmentId);
  while (dept && !seen.has(dept.id)) {
    seen.add(dept.id);
    if (dept.headCode && dept.headCode !== selfCode) return dept.headCode;
    dept = dept.parentId ? departments.find((d) => d.id === dept!.parentId) : undefined;
  }
  return undefined;
}
