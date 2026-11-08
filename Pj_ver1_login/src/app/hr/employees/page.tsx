import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { EmployeesClient } from "./EmployeesClient";

export const metadata: Metadata = { title: "รายชื่อพนักงาน" };

// รายชื่อพนักงานจากตาราง employee ทุกครั้งที่เปิดหน้า (ไม่ cache เพราะ HR แก้ข้อมูลบ่อย)
export const dynamic = "force-dynamic";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const [employees, params] = await Promise.all([getHrEmployees(), searchParams]);
  // ลิงก์จากคิวคำขอส่งรหัสพนักงานมาเป็น ?q= เพื่อเปิดรายชื่อที่ค้นหาไว้แล้ว
  const initialQuery = typeof params.q === "string" ? params.q : "";
  return <EmployeesClient employees={employees} initialQuery={initialQuery} />;
}
