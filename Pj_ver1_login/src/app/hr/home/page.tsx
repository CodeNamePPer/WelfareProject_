import { getHrEmployees } from "@/lib/hr/employees";
import { HomeClient } from "./HomeClient";

// สถานะ/แผนก/หัวหน้าของผู้ยื่นคำขอมาจากตาราง employee ทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

export default async function HrHomePage() {
  const employees = await getHrEmployees();
  return <HomeClient employees={employees} />;
}
