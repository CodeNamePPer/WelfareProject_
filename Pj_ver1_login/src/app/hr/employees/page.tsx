import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { listClaims } from "@/lib/claims/service";
import { bangkokToday } from "@/lib/claims/requester";
import { getBenefitMaxClaims } from "@/lib/hr/claimReview";
import { HrPage } from "@/features/hr/ui";
import { EmployeesClient, type EmployeeRow } from "./EmployeesClient";

export const metadata: Metadata = { title: "จัดการพนักงานและสิทธิ์" };

// รายชื่อพนักงานจากตาราง employee ทุกครั้งที่เปิดหน้า (ไม่ cache เพราะ HR แก้ข้อมูลบ่อย)
export const dynamic = "force-dynamic";

/** นับเหมือนฝั่งผู้ขอ: คำขอที่ยื่นแล้วในปีนี้ ยกเว้นฉบับร่าง ยกเลิก และไม่อนุมัติ */
const NOT_COUNTED = new Set(["draft", "cancelled", "rejected"]);

// H05 จัดการพนักงานและสิทธิ์
export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const [employees, claims, maxClaims, params] = await Promise.all([getHrEmployees(), listClaims(), getBenefitMaxClaims().catch(() => null), searchParams]);
  if (!employees) return <p className="text-13 text-status-rejected">โหลดรายชื่อพนักงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const year = bangkokToday().slice(0, 4);
  const claimCount = new Map<string, number>();
  for (const claim of claims ?? []) {
    if (NOT_COUNTED.has(claim.status) || !(claim.expenseDate ?? claim.createdAt).startsWith(year)) continue;
    claimCount.set(claim.employeeCode, (claimCount.get(claim.employeeCode) ?? 0) + 1);
  }

  const rows: EmployeeRow[] = employees.map((employee) => ({
    code: employee.code,
    name: employee.name,
    department: employee.department ?? "ไม่ระบุแผนก",
    position: employee.position ?? "ไม่ระบุตำแหน่ง",
    positionName: employee.position,
    departmentName: employee.department,
    level: employee.jobLevel ?? "ไม่ระบุระดับ",
    manager: employee.manager?.name ?? null,
    claims: claims ? (claimCount.get(employee.code) ?? 0) : null,
    active: employee.status === "ACTIVE",
    statusLabel: employee.statusLabel,
  }));

  // เพดานรวมจำนวนครั้งของทุกสวัสดิการ ใช้แสดง "เบิกปีนี้ 5/30 ครั้ง" ตามดีไซน์ (null = มีสวัสดิการไม่จำกัดหรือโหลดไม่ได้)
  const maxTotal = maxClaims ? [...maxClaims.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0) || null : null;

  // ลิงก์จากคิวคำขอส่งรหัสพนักงานมาเป็น ?q= เพื่อเปิดรายชื่อที่ค้นหาไว้แล้ว
  const initialQuery = typeof params.q === "string" ? params.q : "";
  return (
    <HrPage>
      <EmployeesClient rows={rows} maxClaimsTotal={maxTotal} initialQuery={initialQuery} />
    </HrPage>
  );
}
