import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { readRequestFilters } from "../urlFilters";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = { title: "คำขอรออนุมัติ" };

// สถานะ/แผนก/หัวหน้าของผู้ยื่นคำขอมาจากตาราง employee ทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

export default async function HrHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [employees, session, params] = await Promise.all([getHrEmployees(), getSession(), searchParams]);
  return (
    <HomeClient
      employees={employees}
      // รหัสพนักงานของผู้ที่เข้าระบบ ใช้กันไม่ให้อนุมัติคำขอของตัวเอง
      viewerCode={session?.sub ?? null}
      initialFilters={readRequestFilters(params)}
      done={typeof params.done === "string" && typeof params.action === "string" ? { id: params.done, action: params.action } : null}
    />
  );
}
