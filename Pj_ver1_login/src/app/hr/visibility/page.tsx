import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { listUnavailableBenefits } from "@/lib/hr/benefitVisibility";
import { HrPage, PageHeader } from "@/features/hr/ui";
import { VisibilityClient } from "./VisibilityClient";

export const metadata: Metadata = { title: "การแสดงสวัสดิการ" };
export const dynamic = "force-dynamic";

// HH3 การแสดงสวัสดิการที่ใช้ไม่ได้ เฉพาะหัวหน้า HR
export default async function VisibilityPage() {
  const [head, rows] = await Promise.all([getSession().then(isHrHead), listUnavailableBenefits()]);
  if (!head) redirect("/hr/home");

  return (
    <HrPage>
      <PageHeader
        title="การแสดงสวัสดิการที่ใช้ไม่ได้"
        description="หัวหน้า HR กำหนดว่าสวัสดิการที่ปิดอยู่ ไม่มีวงเงินปีนี้ หรือพนักงานไม่มีสิทธิ์ จะซ่อนหรือแสดงเป็นการ์ดสีเทา"
      />
      {rows === null ? <p className="text-13 text-status-rejected-ink">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p> : <VisibilityClient rows={rows} />}
    </HrPage>
  );
}
