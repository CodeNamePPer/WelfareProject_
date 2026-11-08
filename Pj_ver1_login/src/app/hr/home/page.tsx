import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { listClaims } from "@/lib/claims/service";
import { hrStatusOf, toHrCounts, toPendingRequest } from "@/lib/claims/mappers";
import { readRequestFilters } from "../urlFilters";
import { HomeClient } from "./HomeClient";
import { HR_STATUSES } from "./statusRows";

export const metadata: Metadata = { title: "คำขอรออนุมัติ" };

// คำขอและสถานะ/แผนก/หัวหน้าของผู้ยื่นมาจากฐานข้อมูลทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

export default async function HrHomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [employees, session, params, claims] = await Promise.all([getHrEmployees(), getSession(), searchParams, listClaims({ statuses: HR_STATUSES })]);
  if (!claims) return <p className="queue-alert" role="alert">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  return (
    <HomeClient
      employees={employees}
      requests={claims.filter((claim) => hrStatusOf(claim.status) === "pending").map(toPendingRequest)}
      counts={toHrCounts(claims)}
      // รหัสพนักงานของผู้ที่เข้าระบบ ใช้กันไม่ให้อนุมัติคำขอของตัวเอง
      viewerCode={session?.sub ?? null}
      // Admin เปิดดูได้ แต่การอนุมัติเป็นงานของ HR
      readOnly={session?.role !== "HR"}
      initialFilters={readRequestFilters(params)}
      done={typeof params.done === "string" && typeof params.action === "string" ? { id: params.done, action: params.action } : null}
    />
  );
}
