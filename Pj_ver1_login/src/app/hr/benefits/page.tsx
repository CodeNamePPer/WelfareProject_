import type { Metadata } from "next";
import { getHrBenefits } from "@/lib/hr/benefits";
import { getOpenProposals } from "@/lib/hr/proposals";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { HrPage } from "@/features/hr/ui";
import { BenefitsClient, type BenefitRow } from "./BenefitsClient";

export const metadata: Metadata = { title: "จัดการสวัสดิการ" };

// ข้อมูลชุดเดียวกับ /admin/benefits และหน้าสิทธิ์ของพนักงาน
export const dynamic = "force-dynamic";

// H03 จัดการสวัสดิการ: HR แก้ตรงไม่ได้ ต้องเสนอผ่านหัวหน้า HR
export default async function BenefitsPage() {
  const [benefits, proposals, session] = await Promise.all([getHrBenefits(), getOpenProposals(), getSession()]);
  const isHead = await isHrHead(session);
  if (!benefits) return <p className="text-13 text-status-rejected-ink">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const rows: BenefitRow[] = benefits.map((benefit) => ({
    code: benefit.code,
    name: benefit.name,
    category: benefit.category ?? "อื่น ๆ",
    amount: benefit.amount,
    claims: benefit.maxClaimsPerYear !== null ? `${benefit.maxClaimsPerYear} ครั้ง/ปี` : benefit.maxClaims || "ไม่จำกัด",
    active: benefit.status === "active",
  }));

  return (
    <HrPage>
      <BenefitsClient rows={rows} proposals={proposals} isHead={isHead} />
    </HrPage>
  );
}
