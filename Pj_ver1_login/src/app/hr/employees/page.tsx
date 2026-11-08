import { getHrEmployees } from "@/lib/hr/employees";
import { EmployeesClient } from "./EmployeesClient";

// รายชื่อพนักงานจากตาราง employee ทุกครั้งที่เปิดหน้า (ไม่ cache เพราะ HR แก้ข้อมูลบ่อย)
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await getHrEmployees();
  return <EmployeesClient employees={employees} />;
}
