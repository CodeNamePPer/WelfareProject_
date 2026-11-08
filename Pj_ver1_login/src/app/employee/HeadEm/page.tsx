import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getSubordinates } from "@/lib/employee/subordinates";
import { getEmployeeBenefits } from "@/lib/claims/service";
import type { EmployeeBenefit } from "@/lib/claims/types";
import HeadEmClient from "./HeadEmClient";

// เข้าได้เฉพาะคนที่มีลูกน้องโดยตรงที่ยังทำงานอยู่ ไม่พึ่งการซ่อนเมนูอย่างเดียว
export default async function HeadEmPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const subordinates = await getSubordinates(session.sub);
  if (subordinates === null) {
    return <p className="text-13 text-status-rejected">โหลดรายชื่อพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }
  if (subordinates.length === 0) {
    redirect("/access-denied?reason=role");
  }

  const benefitLists = await Promise.all(subordinates.map((employee) => getEmployeeBenefits(employee.id)));
  const benefitsByEmployee: Record<string, EmployeeBenefit[]> = Object.fromEntries(subordinates.map((employee, index) => [employee.id, benefitLists[index] ?? []]));

  return <HeadEmClient employees={subordinates} benefitsByEmployee={benefitsByEmployee} />;
}
