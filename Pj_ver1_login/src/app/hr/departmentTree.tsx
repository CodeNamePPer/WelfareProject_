// ตัวเลือกฝ่าย / แผนกตามโครงสร้างองค์กร ใช้ร่วมกันทุกหน้าที่กรองตามแผนก
// เลือกฝ่ายแล้วจะรวมแผนกในฝ่ายนั้นด้วย (เทียบทั้ง department และ parentDepartment)

type HasDepartment = { department: string | null; parentDepartment: string | null };

export type DepartmentNode = { top: string; children: string[] };

export function departmentTree(items: (HasDepartment | null | undefined)[]): DepartmentNode[] {
  const children = new Map<string, Set<string>>();
  for (const item of items) {
    if (!item?.department) continue;
    const top = item.parentDepartment ?? item.department;
    if (!children.has(top)) children.set(top, new Set());
    if (item.parentDepartment) children.get(top)?.add(item.department);
  }
  const byThai = (a: string, b: string) => a.localeCompare(b, "th");
  return Array.from(children.keys())
    .sort(byThai)
    .map((top) => ({ top, children: Array.from(children.get(top) ?? []).sort(byThai) }));
}

/** ตรงกับตัวเลือกที่เลือกไว้ไหม (เลือกฝ่าย = รวมแผนกย่อย) */
export function matchesDepartment(item: HasDepartment | null | undefined, selected: string, all: string) {
  return selected === all || item?.department === selected || item?.parentDepartment === selected;
}

/** <option> ของฝ่ายและแผนกย่อย (แผนกย่อยเยื้องเข้าไป) */
export function DepartmentOptions({ tree }: { tree: DepartmentNode[] }) {
  return (
    <>
      {tree.map(({ top, children }) => [
        <option key={top} value={top}>{top}</option>,
        ...children.map((child) => (
          <option key={`${top}/${child}`} value={child}>{`   └ ${child}`}</option>
        )),
      ])}
    </>
  );
}
